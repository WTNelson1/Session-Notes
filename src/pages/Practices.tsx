import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, softDelete, todayStr } from '../db'

function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(todayStr(d))
  }
  return days
}

export default function Practices() {
  const [title, setTitle] = useState('')
  const days = lastNDays(7)

  const practices = useLiveQuery(async () =>
    (await db.practices.toArray()).filter(alive).sort((a, b) => b.createdAt - a.createdAt),
  )
  const logs = useLiveQuery(async () =>
    (await db.practiceLogs.where('date').aboveOrEqual(days[0]).toArray()).filter(alive),
  )

  const active = practices?.filter((p) => p.active) ?? []
  const archived = practices?.filter((p) => !p.active) ?? []

  async function add() {
    const t = title.trim()
    if (!t) return
    await db.practices.add({ ...newRec(), title: t, note: '', active: 1 })
    setTitle('')
  }

  async function toggleDay(practiceId: string, date: string) {
    const existing = logs?.find((l) => l.practiceId === practiceId && l.date === date)
    if (existing) await softDelete(db.practiceLogs, existing.id)
    else await db.practiceLogs.add({ ...newRec(), practiceId, date })
  }

  return (
    <div>
      <div className="card">
        <h2>Add a practice</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            type="text"
            placeholder="e.g. Morning journaling"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      {active.map((p) => {
        const pLogs = logs?.filter((l) => l.practiceId === p.id) ?? []
        return (
          <div className="card" key={p.id}>
            <div className="row-between">
              <strong>{p.title}</strong>
              <button className="btn-small btn-ghost" onClick={() => patch(db.practices, p.id, { active: 0 })}>
                Archive
              </button>
            </div>
            <div className="row-between" style={{ marginTop: 10 }}>
              <div className="dot-row">
                {days.map((d) => {
                  const filled = pLogs.some((l) => l.date === d)
                  const weekday = new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })
                  return (
                    <button
                      key={d}
                      className={`dot ${filled ? 'filled' : ''}`}
                      style={{ border: undefined }}
                      onClick={() => toggleDay(p.id, d)}
                      aria-label={`${p.title} on ${d}`}
                    >
                      {weekday}
                    </button>
                  )
                })}
              </div>
              <span className="muted small">{pLogs.length}/7</span>
            </div>
          </div>
        )
      })}
      {active.length === 0 && (
        <p className="muted center">
          no active practices · add homework from a session note, or add one above.
        </p>
      )}

      {archived.length > 0 && (
        <details className="help card">
          <summary>Archived ({archived.length})</summary>
          {archived.map((p) => (
            <div key={p.id} className="check-item">
              <span className="text muted">{p.title}</span>
              <button className="btn-small btn-ghost" onClick={() => patch(db.practices, p.id, { active: 1 })}>
                Restore
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
