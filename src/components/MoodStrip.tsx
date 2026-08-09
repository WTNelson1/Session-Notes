import { useState } from 'react'
import { db, newRec } from '../db'

export const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄']

export default function MoodStrip({
  big = false,
  onLogged,
}: {
  big?: boolean
  onLogged?: (score: number) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(score: number) {
    setSelected(score)
    await db.moods.add({
      ...newRec(),
      at: Date.now(),
      score,
      note: note.trim(),
    })
    setSaved(true)
    setNote('')
    onLogged?.(score)
    setTimeout(() => {
      setSaved(false)
      setSelected(null)
    }, 2000)
  }

  return (
    <div className={big ? 'mood-big' : ''}>
      <div className="mood-strip">
        {MOOD_FACES.map((face, i) => (
          <button
            key={i}
            className={`mood-btn ${selected === i + 1 ? 'selected' : ''}`}
            onClick={() => save(i + 1)}
            aria-label={`Mood ${i + 1} of 5`}
          >
            {face}
          </button>
        ))}
      </div>
      {big && (
        <input
          type="text"
          placeholder="Optional: a few words about why"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginTop: 12 }}
        />
      )}
      {saved && <p className="muted small center">logged ✓</p>}
    </div>
  )
}
