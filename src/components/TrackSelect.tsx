import { useState } from 'react'

// Picks which therapy room something belongs to. Tracks are free lowercase
// tags, like buckets: the list is whatever exists in the data, and "new
// track…" grows it inline — no registry, no settings page.
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
    <select
      className="dump-bucket track-select"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        if (e.target.value === '\u0000new') setAdding(true)
        else onChange(e.target.value)
      }}
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      <option value={'\u0000new'}>＋ new track…</option>
    </select>
  )
}
