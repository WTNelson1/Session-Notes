import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, newRec, patch, softDelete, todayStr } from '../db'

export default function SessionDetail() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [sessionId, setSessionId] = useState<string | null>(isNew ? null : (id ?? null))
  const [date, setDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [takeaways, setTakeaways] = useState('')
  const [practiceText, setPracticeText] = useState('')
  const [loaded, setLoaded] = useState(isNew)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (isNew || !id) return
    void db.sessions.get(id).then((s) => {
      if (s) {
        setDate(s.date)
        setNotes(s.notes)
        setTakeaways(s.takeaways)
      }
      setLoaded(true)
    })
  }, [id, isNew])

  const openPrep = useLiveQuery(async () =>
    (await db.prepItems.where('done').equals(0).toArray()).filter(alive),
  )
  const sessionPractices = useLiveQuery(
    async () =>
      sessionId
        ? (await db.practices.toArray()).filter(alive).filter((p) => p.sourceSessionId === sessionId)
        : [],
    [sessionId],
  )

  async function save(): Promise<string> {
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

  async function markPrepCovered(prepId: string) {
    await patch(db.prepItems, prepId, { done: 1, doneAt: Date.now() })
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
    if (!confirm('Delete this session note?')) return
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
        <label className="field">
          <span className="label-text">What came up</span>
          <textarea
            placeholder="What you talked about, what your therapist said, how it felt…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
          />
        </label>
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
            {savedFlash ? 'Saved ✓' : 'Save'}
          </button>
          {sessionId && (
            <button className="btn-danger btn-small" onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </div>

      {openPrep && openPrep.length > 0 && (
        <div className="card">
          <h2>Prep topics — check off what you covered</h2>
          {openPrep.map((p) => (
            <label key={p.id} className="check-item">
              <input type="checkbox" checked={false} onChange={() => markPrepCovered(p.id)} />
              <span className="text">{p.text}</span>
            </label>
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
          Added practices appear on Today for daily tracking.
        </p>
      </div>
    </div>
  )
}
