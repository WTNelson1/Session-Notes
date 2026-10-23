import type { ReactNode } from 'react'

// The smallest markdown renderer that covers what the AI prompts actually
// produce: #/##/### headings, -/*/numbered lists, paragraphs, **bold**,
// *italic*, `code`. Output is built as React nodes — no HTML string ever
// reaches the DOM, so there is nothing to sanitize. Anything outside this
// grammar renders as its literal text, which is also what you want while a
// response is still streaming and the last line is half-written.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g

function inline(text: string, depth = 0): ReactNode[] {
  if (depth > 2) return [text]
  return text.split(INLINE).map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4)
      return <strong key={i}>{inline(seg.slice(2, -2), depth + 1)}</strong>
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2)
      return <code key={i}>{seg.slice(1, -1)}</code>
    if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2)
      return <em key={i}>{inline(seg.slice(1, -1), depth + 1)}</em>
    return seg
  })
}

export default function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = []
  let list: { ordered: boolean; items: ReactNode[][] } | null = null
  let para: string[] = []

  const flushPara = () => {
    if (!para.length) return
    out.push(<p key={out.length}>{inline(para.join(' '))}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((item, i) => <li key={i}>{item}</li>)
    out.push(list.ordered ? <ol key={out.length}>{items}</ol> : <ul key={out.length}>{items}</ul>)
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      flushList()
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushPara()
      flushList()
      const H = (['h1', 'h2', 'h3'] as const)[heading[1].length - 1]
      out.push(<H key={out.length}>{inline(heading[2])}</H>)
      continue
    }
    const item = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line)
    if (item) {
      flushPara()
      const ordered = /^\d/.test(line)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(inline(item[1]))
      continue
    }
    // plain text: a paragraph line; consecutive ones join into one <p>
    flushList()
    para.push(line)
  }
  flushPara()
  flushList()

  return <>{out}</>
}
