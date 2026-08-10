import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, softDelete, todayStr } from '../db'
import FeelingChips from '../components/FeelingChips'

export default function Today() {
  const today = todayStr()

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
          {todayEntries && todayEntries.length > 0 && (
            <span className="muted small">{todayEntries.length} today</span>
          )}
        </div>
        {todayWords.length > 0 ? (
          <FeelingChips words={todayWords} />
        ) : (
          <p className="muted small" style={{ margin: '8px 0 10px' }}>
            nothing named yet today.
          </p>
        )}
        <Link
          to="/journal/new"
          className="btn btn-primary"
          style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}
        >
          ✎ check in
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
        {openPrep && openPrep.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            {openPrep.slice(0, 4).map((p) => (
              <div key={p.id} className="check-item">
                <span className="text">{p.text}</span>
              </div>
            ))}
            {openPrep.length > 4 && (
              <p className="muted small">＋{openPrep.length - 4} more</p>
            )}
          </div>
        ) : (
          <p className="muted small" style={{ marginBottom: 0, marginTop: 8 }}>
            nothing queued — jot things down as they come up during the week.
          </p>
        )}
      </div>

      {lastSession && (
        <div className="card">
          <h2>last session</h2>
          <Link to={`/sessions/${lastSession.id}`} className="session-item">
            <strong>{lastSession.date}</strong>
            <p className="preview" style={{ margin: '4px 0 0' }}>
              {lastSession.notes.replace(/^\s*-\s?/gm, '') || 'no notes'}
            </p>
          </Link>
        </div>
      )}
    </div>
  )
}
