import { useState } from 'react'
import { ensureTrack } from '../db'

// Picks which therapy room something belongs to: every room as a one-tap chip,
// current one lit. Tracks are free lowercase tags like buckets — ＋ grows the
// list inline, no registry, no settings page. A <select> made this a
// three-step trip; with two or three rooms, one tap is the right cost.
export default function TrackSelect({
  value,
  tracks,
  onChange,
  ariaLabel = 'Track',
}: {
  value: string
  tracks: string[]
  onChange: (track: string) => void
  ariaLabel?: string
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  // Tracks created here exist nowhere until a record saves with one — they are
  // only "the current value". Without this list, making a second new track
  // silently evaporated the first, which read as data loss. They stay for the
  // life of this page and become permanent the moment anything saves.
  const [created, setCreated] = useState<string[]>([])

  if (adding) {
    return (
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          const t = name.trim().toLowerCase()
          if (t) {
            setCreated((c) => (c.includes(t) ? c : [...c, t]))
            void ensureTrack(t) // into the synced roster — exists before any note does
            onChange(t)
          }
          setAdding(false)
          setName('')
        }}
      >
        <input
          autoFocus
          type="text"
          className="track-new"
          placeholder="new track…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setAdding(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAdding(false)
          }}
        />
      </form>
    )
  }

  const options = [...new Set([value, ...created, ...tracks])].sort()
  return (
    <span className="track-chips" role="radiogroup" aria-label={ariaLabel}>
      {options.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={t === value}
          className={`btn-small ${t === value ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
      <button
        type="button"
        className="btn-small btn-ghost"
        onClick={() => setAdding(true)}
        aria-label="New track"
        title="new track"
      >
        ＋
      </button>
    </span>
  )
}
