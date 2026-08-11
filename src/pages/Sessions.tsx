import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive } from '../db'

export default function Sessions() {
  const sessions = useLiveQuery(async () =>
    (await db.sessions.toArray())
      .filter(alive)
      .sort((a, b) => b.date.localeCompare(a.date)),
  )

  return (
    <div>
      <Link to="/sessions/new" className="btn btn-solid" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 14 }}>
        ＋ new session note
      </Link>

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
