import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, softDelete, todayStr, type PrepItem } from '../db'
import OutlineEditor, {
  parseOutline,
  serializeOutline,
  type OutlineLine,
} from '../components/OutlineEditor'

export default function SessionDetail() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [sessionId, setSessionId] = useState<string | null>(isNew ? null : (id ?? null))
  const [date, setDate] = useState(todayStr())
  const [outline, setOutline] = useState<OutlineLine[]>(() => parseOutline(''))
  const [takeaways, setTakeaways] = useState('')
  const [practiceText, setPracticeText] = useState('')
  const [loaded, setLoaded] = useState(isNew)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (isNew || !id) return
    void db.sessions.get(id).then((s) => {
      if (s) {
        setDate(s.date)
        setOutline(parseOutline(s.notes))
        setTakeaways(s.takeaways)
      }
      setLoaded(true)
    })
  }, [id, isNew])

  const prepItems = useLiveQuery(async () => (await db.prepItems.toArray()).filter(alive))
  const openTops = (prepItems ?? [])
    .filter((p) => !p.parentId && !p.done)
    .sort((a, b) => b.createdAt - a.createdAt)
  const childrenOf = (pid: string) =>
    (prepItems ?? []).filter((p) => p.parentId === pid).sort((a, b) => a.createdAt - b.createdAt)

  const sessionPractices = useLiveQuery(
    async () =>
      sessionId
        ? (await db.practices.toArray()).filter(alive).filter((p) => p.sourceSessionId === sessionId)
        : [],
    [sessionId],
  )

  async function save(): Promise<string> {
    const notes = serializeOutline(outline)
    if (sessionId) {
      await patch(db.sessions, sessionId, { date, notes, takeaways })
      return sessionId
    }
    const rec = { ...newRec(), date, notes, takeaways }
    await db.sessions.add(rec)
    setSessionId(rec.id)
    return rec.id
  }

  async function saveAndFlash() {
    await save()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function markCovered(item: PrepItem, cascade: boolean) {
    await patch(db.prepItems, item.id, { done: 1, doneAt: Date.now() })
    if (cascade) {
      for (const child of childrenOf(item.id).filter((c) => !c.done)) {
        await patch(db.prepItems, child.id, { done: 1, doneAt: Date.now() })
      }
    }
  }

  async function addPractice() {
    const t = practiceText.trim()
    if (!t) return
    const sid = await save()
    await db.practices.add({ ...newRec(), title: t, note: '', active: 1, sourceSessionId: sid })
    setPracticeText('')
  }

  async function remove() {
    if (!sessionId) return
    await softDelete(db.sessions, sessionId)
    navigate('/sessions')
  }

  if (!loaded) return <p className="muted">Loading…</p>

  return (
    <div>
      <div className="card">
        <label className="field">
          <span className="label-text">Session date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field">
          <span className="label-text">
            What came up <span className="hint">(Tab / ⇥ to nest bullets)</span>
          </span>
          <OutlineEditor
            lines={outline}
            onChange={setOutline}
            placeholder="What you talked about, what your therapist said, how it felt…"
          />
        </div>
        <label className="field">
          <span className="label-text">Key takeaways</span>
          <textarea
            placeholder="The one or two things you want to remember"
            value={takeaways}
            onChange={(e) => setTakeaways(e.target.value)}
            rows={3}
          />
        </label>
        <div className="row-between">
          <button className="btn-primary" onClick={saveAndFlash}>
            {savedFlash ? 'saved ✓' : 'save'}
          </button>
          {sessionId &&
            (confirmingDelete ? (
              <span className="row">
                <button className="btn-danger btn-small" onClick={remove}>
                  sure?
                </button>
                <button className="btn-small btn-ghost" onClick={() => setConfirmingDelete(false)}>
                  ×
                </button>
              </span>
            ) : (
              <button
                className="btn-small btn-ghost danger-hover"
                onClick={() => setConfirmingDelete(true)}
              >
                delete
              </button>
            ))}
        </div>
      </div>

      {openTops.length > 0 && (
        <div className="card">
          <h2>Prep topics — check off what you covered</h2>
          {openTops.map((p) => (
            <div key={p.id} className="topic-group">
              <label className="check-item">
                <input type="checkbox" checked={false} onChange={() => markCovered(p, true)} />
                <span className="text">{p.text}</span>
              </label>
              {childrenOf(p.id).map((c) => (
                <label key={c.id} className={`check-item sub-item ${c.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!c.done}
                    onChange={() =>
                      c.done
                        ? patch(db.prepItems, c.id, { done: 0, doneAt: undefined })
                        : markCovered(c, false)
                    }
                  />
                  <span className="text">{c.text}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Homework / practices from this session</h2>
        {sessionPractices?.map((p) => (
          <div key={p.id} className="check-item">
            <span className="text">🌱 {p.title}</span>
          </div>
        ))}
        <form
          className="row"
          style={{ marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            void addPractice()
          }}
        >
          <input
            type="text"
            placeholder="e.g. 5-minute breathing before bed"
            value={practiceText}
            onChange={(e) => setPracticeText(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
        <p className="muted small" style={{ marginBottom: 0 }}>
          added practices appear on today for daily tracking.
        </p>
      </div>
    </div>
  )
}
