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
  const unsummarized =
    sessions?.filter((s) => s.notes.trim() && !s.summary) ?? []

  async function backfill() {
    if (!apiKey || progress) return
    let done = 0
    for (const s of unsummarized) {
      setProgress(`✦ ${done + 1}/${unsummarized.length}…`)
      try {
        const summary = await summarizeSession(apiKey, s.notes, s.takeaways)
        if (summary) {
          await patch(db.sessions, s.id, {
            summary,
            summaryHash: textHash(s.notes + '|' + s.takeaways),
          })
        }
      } catch {
        // offline / declined — skip this one, it stays on the raw preview
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

      {apiKey && unsummarized.length > 0 && (
        <button
          className="btn-small"
          style={{ display: 'block', margin: '0 auto 14px' }}
          disabled={!!progress}
          onClick={backfill}
        >
          {progress ?? `✦ summarize ${unsummarized.length} older ${unsummarized.length === 1 ? 'note' : 'notes'}`}
        </button>
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
          <p className="preview" style={{ margin: '6px 0 0' }}>
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
