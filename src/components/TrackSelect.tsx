import { useState } from 'react'

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

  if (adding) {
    return (
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          const t = name.trim().toLowerCase()
          if (t) onChange(t)
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

  const options = [...new Set([value, ...tracks])].sort()
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
