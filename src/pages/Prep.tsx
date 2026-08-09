import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, softDelete } from '../db'

export default function Prep() {
  const [text, setText] = useState('')

  const items = useLiveQuery(async () =>
    (await db.prepItems.toArray())
      .filter(alive)
      .sort((a, b) => b.createdAt - a.createdAt),
  )
  const open = items?.filter((i) => !i.done) ?? []
  const done = items?.filter((i) => i.done) ?? []

  async function add() {
    const t = text.trim()
    if (!t) return
    await db.prepItems.add({ ...newRec(), text: t, done: 0 })
    setText('')
  }

  async function toggle(id: string, isDone: boolean) {
    await patch(db.prepItems, id, isDone ? { done: 0, doneAt: undefined } : { done: 1, doneAt: Date.now() })
  }

  return (
    <div>
      <div className="card">
        <h2>Bring to next session</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            type="text"
            placeholder="Something to talk about…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>

        <div style={{ marginTop: 10 }}>
          {open.map((i) => (
            <div key={i.id} className="check-item">
              <input type="checkbox" checked={false} onChange={() => toggle(i.id, false)} />
              <span className="text">{i.text}</span>
              <button className="btn-small btn-ghost" onClick={() => softDelete(db.prepItems, i.id)} aria-label="Delete">
                ×
              </button>
            </div>
          ))}
          {open.length === 0 && (
            <p className="muted small">Nothing queued. Add thoughts as they come up — check them off once they've been discussed.</p>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <div className="card">
          <h2>Covered</h2>
          {done.map((i) => (
            <div key={i.id} className="check-item done">
              <input type="checkbox" checked onChange={() => toggle(i.id, true)} />
              <span className="text">{i.text}</span>
              <button className="btn-small btn-ghost" onClick={() => softDelete(db.prepItems, i.id)} aria-label="Delete">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
