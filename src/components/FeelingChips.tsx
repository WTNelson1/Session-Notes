import { WORD_COLOR } from '../feelings'

export default function FeelingChips({
  words,
  onRemove,
}: {
  words: string[]
  onRemove?: (word: string) => void
}) {
  if (words.length === 0) return null
  return (
    <div className="chip-row">
      {words.map((w) => (
        <span key={w} className="feeling-chip">
          <span
            className="feeling-dot"
            style={{ background: WORD_COLOR.get(w) ?? 'var(--accent)' }}
          />
          {w}
          {onRemove && (
            <button className="chip-x" onClick={() => onRemove(w)} aria-label={`remove ${w}`}>
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
