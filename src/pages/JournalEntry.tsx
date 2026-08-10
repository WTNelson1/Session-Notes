import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, newRec, patch, softDelete } from '../db'
import FeelingsWheel from '../components/FeelingsWheel'
import FeelingChips from '../components/FeelingChips'

export default function JournalEntry() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [entryId, setEntryId] = useState<string | null>(isNew ? null : (id ?? null))
  const [words, setWords] = useState<string[]>([])
  const [text, setText] = useState('')
  const [at, setAt] = useState(Date.now())
  const [loaded, setLoaded] = useState(isNew)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (isNew || !id) return
    void db.journal.get(id).then((e) => {
      if (e) {
        setWords(e.words)
        setText(e.text)
        setAt(e.at)
      }
      setLoaded(true)
    })
  }, [id, isNew])

  function toggle(word: string) {
    setWords((w) => (w.includes(word) ? w.filter((x) => x !== word) : [...w, word]))
  }

  async function save() {
    if (entryId) {
      await patch(db.journal, entryId, { words, text })
    } else {
      const rec = { ...newRec(), at, words, text }
      await db.journal.add(rec)
      setEntryId(rec.id)
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function remove() {
    if (!entryId) return
    await softDelete(db.journal, entryId)
    navigate('/journal')
  }

  if (!loaded) return <p className="muted">loading…</p>

  return (
    <div>
      <div className="card">
        <h2>what are you feeling?</h2>
        <FeelingsWheel selected={words} onToggle={toggle} />
        <FeelingChips words={words} onRemove={toggle} />
      </div>

      <div className="card">
        <h2>write it out</h2>
        <textarea
          placeholder="what's going on? no structure needed — just what's true right now."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        <div className="row-between" style={{ marginTop: 10 }}>
          <button className="btn-primary" onClick={save} disabled={words.length === 0 && !text.trim()}>
            {savedFlash ? 'saved ✓' : 'save'}
          </button>
          {entryId &&
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
    </div>
  )
}
