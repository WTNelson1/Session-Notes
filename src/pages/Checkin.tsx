import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, newRec } from '../db'
import FeelingsWheel from '../components/FeelingsWheel'
import FeelingChips from '../components/FeelingChips'

export default function Checkin() {
  const [words, setWords] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  function toggle(word: string) {
    setWords((w) => (w.includes(word) ? w.filter((x) => x !== word) : [...w, word]))
  }

  async function save() {
    await db.journal.add({ ...newRec(), at: Date.now(), words, text: note.trim() })
    setWords([])
    setNote('')
    setDone(true)
  }

  return (
    <div className="checkin-page">
      {done ? (
        <div className="center">
          <div className="big-check">✓</div>
          <h2>logged</h2>
          <p className="muted">naming it is the work.</p>
          <div className="stack" style={{ marginTop: 16 }}>
            <button onClick={() => setDone(false)}>log another</button>
            <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
              open anchor
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 style={{ marginBottom: 2, textAlign: 'center' }}>quick check-in</h1>
          <p className="muted center" style={{ marginTop: 4 }}>
            what are you feeling right now? pick as many as fit.
          </p>
          <FeelingsWheel selected={words} onToggle={toggle} />
          <FeelingChips words={words} onRemove={toggle} />
          <input
            type="text"
            placeholder="optional: a line about why"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginTop: 12 }}
          />
          <button
            className="btn-primary"
            style={{ marginTop: 10 }}
            disabled={words.length === 0 && !note.trim()}
            onClick={save}
          >
            log it
          </button>
        </>
      )}
    </div>
  )
}
