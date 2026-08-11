import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, patch } from '../db'
import { summarizeSession, textHash } from '../ai'
import { getSetting } from '../settings'

export default function Sessions() {
  const [progress, setProgress] = useState<string | null>(null)

  const sessions = useLiveQuery(async () =>
    (await db.sessions.toArray())
      .filter(alive)
      .sort((a, b) => b.date.localeCompare(a.date)),
  )

  const apiKey = getSetting('apiKey')
  const summarizable = sessions?.filter((s) => s.notes.trim()) ?? []
  const unsummarized = summarizable.filter((s) => !s.summary)

  /** force=true re-runs every note (e.g. after changing the about-you context) */
  async function backfill(force: boolean) {
    if (!apiKey || progress) return
    const targets = force ? summarizable : unsummarized
    let done = 0
    for (const s of targets) {
      setProgress(`✦ ${done + 1}/${targets.length}…`)
      try {
        const summary = await summarizeSession(apiKey, s.notes, s.takeaways)
        if (summary) {
          await patch(db.sessions, s.id, {
            summary,
            summaryHash: textHash(s.notes + '|' + s.takeaways),
          })
        }
      } catch {
        // offline / declined — skip this one, it keeps its current preview
      }
      done++
    }
    setProgress(null)
  }

  return (
    <div>
      <Link to="/sessions/new" className="btn btn-solid" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 14 }}>
        ＋ new session note
      </Link>

      {apiKey && summarizable.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginBottom: 14 }}>
          {unsummarized.length > 0 && (
            <button className="btn-small" disabled={!!progress} onClick={() => backfill(false)}>
              {progress ?? `✦ summarize ${unsummarized.length} older ${unsummarized.length === 1 ? 'note' : 'notes'}`}
            </button>
          )}
          <button
            className="btn-small btn-ghost"
            disabled={!!progress}
            onClick={() => backfill(true)}
          >
            {progress && unsummarized.length === 0 ? progress : '↻ regenerate all summaries'}
          </button>
        </div>
      )}

      {sessions?.map((s) => (
        <Link key={s.id} to={`/sessions/${s.id}`} className="card session-item">
          <strong>
            {new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </strong>
          <p className={`preview ${s.summary ? 'full' : ''}`} style={{ margin: '6px 0 0' }}>
            {s.summary ? `✦ ${s.summary}` : s.notes.replace(/^\s*-\s?/gm, '') || 'no notes'}
          </p>
        </Link>
      ))}
      {sessions && sessions.length === 0 && (
        <p className="muted center">no session notes yet · capture what came up while it's fresh.</p>
      )}
    </div>
  )
}
