import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, softDelete, todayStr } from '../db'
import FeelingChips from '../components/FeelingChips'
import FeelingsWheel from '../components/FeelingsWheel'

export default function Today() {
  const today = todayStr()
  const [selected, setSelected] = useState<string[]>([])
  const [flash, setFlash] = useState(false)
  const [jot, setJot] = useState('')
  const [jotFlash, setJotFlash] = useState(false)

  const openPrep = useLiveQuery(async () =>
    (await db.prepItems.where('done').equals(0).toArray()).filter(
      (p) => alive(p) && !p.parentId,
    ),
  )
  const practices = useLiveQuery(async () =>
    (await db.practices.where('active').equals(1).toArray()).filter(alive),
  )
  const todayLogs = useLiveQuery(async () =>
    (await db.practiceLogs.where('date').equals(today).toArray()).filter(alive),
  )
  const todayEntries = useLiveQuery(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return (await db.journal.where('at').aboveOrEqual(start.getTime()).toArray())
      .filter(alive)
      .sort((a, b) => a.at - b.at)
  })
  const lastSession = useLiveQuery(async () => {
    const all = (await db.sessions.toArray()).filter(alive)
    return all.sort((a, b) => b.date.localeCompare(a.date))[0]
  })

  function toggleWord(word: string) {
    setSelected((w) => (w.includes(word) ? w.filter((x) => x !== word) : [...w, word]))
  }

  async function logFeelings() {
    if (selected.length === 0) return
    await db.journal.add({ ...newRec(), at: Date.now(), words: selected, text: '' })
    setSelected([])
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

  async function addJot() {
    const t = jot.trim()
    if (!t) return
    await db.prepItems.add({ ...newRec(), text: t, done: 0 })
    setJot('')
    setJotFlash(true)
    setTimeout(() => setJotFlash(false), 1500)
  }

  async function togglePractice(practiceId: string) {
    const existing = todayLogs?.find((l) => l.practiceId === practiceId)
    if (existing) await softDelete(db.practiceLogs, existing.id)
    else await db.practiceLogs.add({ ...newRec(), practiceId, date: today })
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const todayWords = [...new Set(todayEntries?.flatMap((e) => e.words) ?? [])]

  return (
    <div>
      <p className="muted" style={{ marginTop: 0, textTransform: 'lowercase' }}>
        {dateLabel}
      </p>

      <div className="card">
        <div className="row-between">
          <h2 style={{ marginBottom: 0 }}>right now</h2>
          {todayWords.length > 0 && (
            <span className="muted small">today · {todayWords.length} named</span>
          )}
        </div>
        {todayWords.length > 0 && <FeelingChips words={todayWords} />}
        <div style={{ marginTop: 10 }}>
          <FeelingsWheel selected={selected} onToggle={toggleWord} />
        </div>
        <FeelingChips words={selected} onRemove={toggleWord} />
        {(selected.length > 0 || flash) && (
          <button className="btn-primary" style={{ marginTop: 10 }} onClick={logFeelings}>
            {flash ? 'logged ✓' : 'log it'}
          </button>
        )}
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link
          to="/journal/new"
          className="btn"
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
        >
          ✎ journal entry
        </Link>
        <Link
          to="/sessions/new"
          className="btn"
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
        >
          ≣ session note
        </Link>
      </div>

      {practices && practices.length > 0 && (
        <div className="card">
          <div className="row-between">
            <h2 style={{ marginBottom: 0 }}>today's practices</h2>
            <Link to="/practices" className="muted small" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              manage →
            </Link>
          </div>
          <div style={{ marginTop: 8 }}>
            {practices.map((p) => {
              const done = !!todayLogs?.find((l) => l.practiceId === p.id)
              return (
                <label key={p.id} className={`check-item ${done ? 'done' : ''}`}>
                  <input type="checkbox" checked={done} onChange={() => togglePractice(p.id)} />
                  <span className="text">{p.title}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row-between">
          <h2 style={{ marginBottom: 0 }}>for next session</h2>
          <Link to="/prep" className="muted small" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            all →
          </Link>
        </div>
        <form
          className="row"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            void addJot()
          }}
        >
          <input
            type="text"
            placeholder="jot something to bring up…"
            value={jot}
            onChange={(e) => setJot(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            {jotFlash ? '✓' : 'add'}
          </button>
        </form>
        {openPrep && openPrep.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {openPrep.slice(0, 4).map((p) => (
              <div key={p.id} className="check-item">
                <span className="text">{p.text}</span>
              </div>
            ))}
            {openPrep.length > 4 && (
              <p className="muted small">＋{openPrep.length - 4} more</p>
            )}
          </div>
        )}
      </div>

      {lastSession && (
        <div className="card">
          <h2>last session</h2>
          <Link to={`/sessions/${lastSession.id}`} className="session-item">
            <strong>{lastSession.date}</strong>
            <p
              className={`preview ${lastSession.summary ? 'full' : ''}`}
              style={{ margin: '4px 0 0' }}
            >
              {lastSession.summary
                ? `✦ ${lastSession.summary}`
                : lastSession.notes.replace(/^\s*-\s?/gm, '') || 'no notes'}
            </p>
          </Link>
        </div>
      )}
    </div>
  )
}
