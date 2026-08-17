import { useEffect, useRef, useState } from 'react'

/** Tap-to-edit text. Enter or blur saves; Escape cancels; empty is ignored. */
export default function EditableText({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (next: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  function commit() {
    const t = draft.trim()
    if (t && t !== value) onSave(t)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        className={`${className ?? ''} editable`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="tap to edit"
      >
        {value}
      </span>
    )
  }

  return (
    <input
      ref={ref}
      type="text"
      className={`${className ?? ''} editable-input`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
