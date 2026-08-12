import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, softDelete, type PrepItem } from '../db'

function SubItemInput({ parentId }: { parentId: string }) {
  const [text, setText] = useState('')
  async function add() {
    const t = text.trim()
    if (!t) return
    await db.prepItems.add({ ...newRec(), text: t, done: 0, parentId })
    setText('')
  }
  return (
    <form
      className="row sub-input"
      onSubmit={(e) => {
        e.preventDefault()
        void add()
      }}
    >
      <input
        type="text"
        placeholder="Add a detail…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="btn-small">
        Add
      </button>
    </form>
  )
}

/** inline bucket assignment: existing buckets as chips + a "new…" input */
function BucketPicker({
  item,
  buckets,
  onClose,
}: {
  item: PrepItem
  buckets: string[]
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')

  async function assign(bucket: string | undefined) {
    await patch(db.prepItems, item.id, { bucket })
    onClose()
  }

  return (
    <div className="bucket-picker">
      {buckets.map((b) => (
        <button
          key={b}
          className={`btn-small ${item.bucket === b ? 'btn-primary' : ''}`}
          onClick={() => assign(item.bucket === b ? undefined : b)}
        >
          {b}
        </button>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          const t = newName.trim().toLowerCase()
          if (t) void assign(t)
        }}
      >
        <input
          type="text"
          placeholder="new bucket…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-small">
          ok
        </button>
      </form>
      {item.bucket && (
        <button className="btn-small btn-ghost" onClick={() => assign(undefined)}>
          × remove from "{item.bucket}"
        </button>
      )}
    </div>
  )
}

export default function Prep() {
  const [text, setText] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickingId, setPickingId] = useState<string | null>(null)

  const items = useLiveQuery(async () => (await db.prepItems.toArray()).filter(alive))

  const tops = (items ?? [])
    .filter((i) => !i.parentId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const childrenOf = (id: string) =>
    (items ?? [])
      .filter((i) => i.parentId === id)
      .sort((a, b) => a.createdAt - b.createdAt)

  const open = tops.filter((i) => !i.done)
  const done = tops.filter((i) => i.done)

  const buckets = [...new Set(open.map((i) => i.bucket).filter(Boolean) as string[])].sort()
  const inbox = open.filter((i) => !i.bucket)

  async function add() {
    const t = text.trim()
    if (!t) return
    await db.prepItems.add({ ...newRec(), text: t, done: 0 })
    setText('')
  }

  async function toggleTop(item: PrepItem) {
    if (item.done) {
      await patch(db.prepItems, item.id, { done: 0, doneAt: undefined })
    } else {
      // covering a topic covers its sub-items too
      await patch(db.prepItems, item.id, { done: 1, doneAt: Date.now() })
      for (const child of childrenOf(item.id).filter((c) => !c.done)) {
        await patch(db.prepItems, child.id, { done: 1, doneAt: Date.now() })
      }
    }
  }

  async function toggleChild(child: PrepItem) {
    await patch(
      db.prepItems,
      child.id,
      child.done ? { done: 0, doneAt: undefined } : { done: 1, doneAt: Date.now() },
    )
  }

  async function removeWithChildren(id: string) {
    for (const child of childrenOf(id)) await softDelete(db.prepItems, child.id)
    await softDelete(db.prepItems, id)
  }

  function renderChildren(parent: PrepItem) {
    return childrenOf(parent.id).map((c) => (
      <div key={c.id} className={`check-item sub-item ${c.done ? 'done' : ''}`}>
        <input type="checkbox" checked={!!c.done} onChange={() => toggleChild(c)} />
        <span className="text">{c.text}</span>
        <button
          className="btn-small btn-ghost"
          onClick={() => softDelete(db.prepItems, c.id)}
          aria-label="Delete"
        >
          ×
        </button>
      </div>
    ))
  }

  function renderTopic(i: PrepItem) {
    return (
      <div key={i.id} className="topic-group">
        <div className="check-item">
          <input type="checkbox" checked={false} onChange={() => toggleTop(i)} />
          <span className="text">{i.text}</span>
          <button
            className="btn-small btn-ghost"
            onClick={() => setPickingId(pickingId === i.id ? null : i.id)}
            aria-label="Move to bucket"
            title="Move to bucket"
          >
            ⌗
          </button>
          <button
            className="btn-small btn-ghost"
            onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}
            aria-label="Add sub-item"
            title="Add sub-item"
          >
            {expandedId === i.id ? '−' : '＋'}
          </button>
          <button
            className="btn-small btn-ghost"
            onClick={() => removeWithChildren(i.id)}
            aria-label="Delete"
          >
            ×
          </button>
        </div>
        {pickingId === i.id && (
          <BucketPicker item={i} buckets={buckets} onClose={() => setPickingId(null)} />
        )}
        {renderChildren(i)}
        {expandedId === i.id && <SubItemInput parentId={i.id} />}
      </div>
    )
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
          {inbox.map(renderTopic)}
          {buckets.map((b) => (
            <div key={b}>
              <p className="bucket-header">
                ⌗ {b} · {open.filter((i) => i.bucket === b).length}
              </p>
              {open.filter((i) => i.bucket === b).map(renderTopic)}
            </div>
          ))}
          {open.length === 0 && (
            <p className="muted small">
              nothing queued · add thoughts as they come up — ＋ nests details under a topic · ⌗
              files it into a bucket · check things off once discussed.
            </p>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <div className="card">
          <h2>Covered</h2>
          {done.map((i) => (
            <div key={i.id} className="topic-group">
              <div className="check-item done">
                <input type="checkbox" checked onChange={() => toggleTop(i)} />
                <span className="text">{i.text}</span>
                <button
                  className="btn-small btn-ghost"
                  onClick={() => removeWithChildren(i.id)}
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
              {renderChildren(i)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
