import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, softDelete } from '../db'
import { PRESETS, buildContext, runInsight } from '../ai'
import { getSetting } from '../settings'

const RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Everything', days: null },
] as const

export default function Insights() {
  const apiKey = getSetting('apiKey')
  const [rangeIdx, setRangeIdx] = useState(1)
  const [custom, setCustom] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [activeTitle, setActiveTitle] = useState('')
  const [error, setError] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)

  const history = useLiveQuery(async () =>
    (await db.insights.toArray()).filter(alive).sort((a, b) => b.createdAt - a.createdAt),
  )

  async function run(title: string, question: string) {
    if (running) return
    setRunning(true)
    setError('')
    setOutput('')
    setActiveTitle(title)
    try {
      const context = await buildContext(RANGES[rangeIdx].days)
      let acc = ''
      const full = await runInsight(apiKey, question, context, (delta) => {
        acc += delta
        setOutput(acc)
      })
      setOutput(full)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setRunning(false)
    }
  }

  async function saveInsight() {
    if (!output) return
    await db.insights.add({ ...newRec(), title: activeTitle, content: output })
    setOutput('')
    setActiveTitle('')
  }

  if (!apiKey) {
    return (
      <div className="card">
        <h2>AI insights</h2>
        <p className="muted">
          Add your Anthropic API key in <Link to="/settings">Settings</Link> to enable insights.
          Your notes are only sent to the Claude API when you run an analysis — never in the
          background.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h2>Analyze</h2>
        <label className="field">
          <span className="label-text">Time range</span>
          <select value={rangeIdx} onChange={(e) => setRangeIdx(Number(e.target.value))}>
            {RANGES.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button key={p.id} disabled={running} onClick={() => run(p.label, p.prompt)}>
              {p.label}
            </button>
          ))}
        </div>
        <form
          className="row"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (custom.trim()) void run('Custom question', custom.trim())
          }}
        >
          <input
            type="text"
            placeholder="Or ask your own question…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button type="submit" disabled={running || !custom.trim()}>
            Ask
          </button>
        </form>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Running an analysis sends the selected notes to Anthropic's Claude API.
        </p>
      </div>

      {(running || output || error) && (
        <div className="card">
          <div className="row-between">
            <h2 style={{ marginBottom: 0 }}>{activeTitle || 'Result'}</h2>
            {running && <span className="muted small">thinking…</span>}
          </div>
          {error && <p className="error-text">{error}</p>}
          <div ref={outputRef} className="insight-output" style={{ marginTop: 10 }}>
            {output}
          </div>
          {!running && output && (
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn-primary btn-small" onClick={saveInsight}>
                Save
              </button>
              <button className="btn-small btn-ghost" onClick={() => setOutput('')}>
                Discard
              </button>
            </div>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <div className="card">
          <h2>Saved insights</h2>
          {history.map((ins) => (
            <details key={ins.id} className="help" style={{ marginBottom: 8 }}>
              <summary>
                {ins.title} — {new Date(ins.createdAt).toLocaleDateString()}
              </summary>
              <div className="insight-output small" style={{ marginTop: 8 }}>
                {ins.content}
              </div>
              <button
                className="btn-small btn-ghost"
                style={{ marginTop: 6 }}
                onClick={() => softDelete(db.insights, ins.id)}
              >
                Delete
              </button>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
