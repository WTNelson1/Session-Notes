import { useEffect, useRef, useState } from 'react'

export interface OutlineLine {
  id: string
  level: number
  text: string
}

const MAX_LEVEL = 4

function blank(): OutlineLine {
  return { id: crypto.randomUUID(), level: 0, text: '' }
}

/** Parse markdown-style bullets ("- text", two spaces per indent level). */
export function parseOutline(text: string): OutlineLine[] {
  const rows = text.split('\n').filter((l) => l.trim() !== '')
  if (rows.length === 0) return [blank()]
  return rows.map((raw) => {
    const m = raw.match(/^(\s*)-\s?(.*)$/)
    if (m) {
      return {
        id: crypto.randomUUID(),
        level: Math.min(MAX_LEVEL, Math.floor(m[1].length / 2)),
        text: m[2],
      }
    }
    return { id: crypto.randomUUID(), level: 0, text: raw.trim() }
  })
}

export function serializeOutline(lines: OutlineLine[]): string {
  return lines
    .filter((l) => l.text.trim() !== '')
    .map((l) => '  '.repeat(l.level) + '- ' + l.text.trim())
    .join('\n')
}

export default function OutlineEditor({
  lines,
  onChange,
  placeholder,
}: {
  lines: OutlineLine[]
  onChange: (lines: OutlineLine[]) => void
  placeholder?: string
}) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>())
  const [focusId, setFocusId] = useState<string | null>(null)
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null)

  useEffect(() => {
    refs.current.forEach((el) => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
    if (pendingFocus.current) {
      const el = refs.current.get(pendingFocus.current.id)
      if (el) {
        el.focus()
        const pos = Math.min(pendingFocus.current.caret, el.value.length)
        el.setSelectionRange(pos, pos)
      }
      pendingFocus.current = null
    }
  }, [lines])

  function maxLevelAt(index: number): number {
    if (index === 0) return 0
    return Math.min(MAX_LEVEL, lines[index - 1].level + 1)
  }

  function setText(index: number, text: string) {
    const next = [...lines]
    next[index] = { ...next[index], text }
    onChange(next)
  }

  function splitLine(index: number, caret: number) {
    const cur = lines[index]
    const before = cur.text.slice(0, caret)
    const after = cur.text.slice(caret)
    const fresh: OutlineLine = { id: crypto.randomUUID(), level: cur.level, text: after }
    const next = [...lines]
    next[index] = { ...cur, text: before }
    next.splice(index + 1, 0, fresh)
    pendingFocus.current = { id: fresh.id, caret: 0 }
    onChange(next)
  }

  function removeLine(index: number) {
    if (lines.length === 1) return
    const next = [...lines]
    next.splice(index, 1)
    const prev = next[Math.max(0, index - 1)]
    pendingFocus.current = { id: prev.id, caret: prev.text.length }
    onChange(next)
  }

  function indentLine(id: string, delta: number) {
    const index = lines.findIndex((l) => l.id === id)
    if (index < 0) return
    const cur = lines[index]
    const level = Math.max(0, Math.min(maxLevelAt(index), cur.level + delta))
    if (level === cur.level) return
    const next = [...lines]
    next[index] = { ...cur, level }
    const el = refs.current.get(id)
    pendingFocus.current = { id, caret: el ? el.selectionStart : cur.text.length }
    onChange(next)
  }

  function addAtEnd() {
    const fresh = blank()
    fresh.level = lines.length ? lines[lines.length - 1].level : 0
    pendingFocus.current = { id: fresh.id, caret: 0 }
    onChange([...lines, fresh])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      splitLine(index, el.selectionStart)
    } else if (e.key === 'Backspace' && lines[index].text === '') {
      e.preventDefault()
      removeLine(index)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      indentLine(lines[index].id, e.shiftKey ? -1 : 1)
    }
  }

  return (
    <div className="outline-editor">
      {lines.map((line, i) => (
        <div key={line.id} className="outline-line" style={{ paddingLeft: line.level * 20 }}>
          <span className={`outline-bullet lvl-${line.level % 3}`}>•</span>
          <textarea
            rows={1}
            ref={(el) => {
              if (el) refs.current.set(line.id, el)
              else refs.current.delete(line.id)
            }}
            value={line.text}
            placeholder={i === 0 && lines.length === 1 ? placeholder : undefined}
            onChange={(e) => setText(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onFocus={() => setFocusId(line.id)}
          />
        </div>
      ))}
      <div className="outline-toolbar">
        <button
          type="button"
          className="btn-small"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => focusId && indentLine(focusId, -1)}
        >
          ⇤ Outdent
        </button>
        <button
          type="button"
          className="btn-small"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => focusId && indentLine(focusId, 1)}
        >
          ⇥ Indent
        </button>
        <button type="button" className="btn-small" onClick={addAtEnd}>
          + Bullet
        </button>
      </div>
    </div>
  )
}
