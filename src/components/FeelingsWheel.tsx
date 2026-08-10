import { useState, type CSSProperties } from 'react'
import { WHEEL, type CoreFamily } from '../feelings'

const CX = 180
const CY = 180

function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) }
}

/** annular sector from startDeg to endDeg (clockwise from 12 o'clock) */
function arcPath(r1: number, r2: number, startDeg: number, endDeg: number) {
  const large = endDeg - startDeg > 180 ? 1 : 0
  const a = polar(r2, startDeg)
  const b = polar(r2, endDeg)
  const c = polar(r1, endDeg)
  const d = polar(r1, startDeg)
  return [
    `M ${a.x} ${a.y}`,
    `A ${r2} ${r2} 0 ${large} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${r1} ${r1} 0 ${large} 0 ${d.x} ${d.y}`,
    'Z',
  ].join(' ')
}

/** radial label placement — flipped on the left half so text is never upside down */
function radialLabel(mid: number, rIn: number, rOut: number) {
  const flip = mid > 180
  const r0 = flip ? rOut - 7 : rIn + 7
  const rot = flip ? mid + 90 : mid - 90
  const p = polar(r0, mid)
  return { x: p.x, y: p.y, rot, anchor: 'start' as const }
}

function WordChip({
  word,
  color,
  selected,
  strong = false,
  onClick,
}: {
  word: string
  color: string
  selected: boolean
  strong?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`word-chip ${selected ? 'sel' : ''} ${strong ? 'strong' : ''}`}
      style={{ '--fam': color } as CSSProperties}
      onClick={onClick}
    >
      <span className="feeling-dot" style={{ background: color }} />
      {word}
    </button>
  )
}

export default function FeelingsWheel({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (word: string) => void
}) {
  const [focused, setFocused] = useState<CoreFamily | null>(null)
  const isSel = (w: string) => selected.includes(w)

  if (!focused) {
    const n = WHEEL.length
    const step = 360 / n
    return (
      <div className="wheel-wrap">
        <svg viewBox="0 0 360 360">
          {WHEEL.map((core, i) => {
            const start = i * step
            const mid = start + step / 2
            const lab = radialLabel(mid, 62, 168)
            const anySel =
              isSel(core.name) ||
              core.children.some(
                (m) => isSel(m.name) || m.children.some((w) => isSel(w)),
              )
            return (
              <g key={core.name} onClick={() => setFocused(core)} style={{ cursor: 'pointer' }}>
                <path
                  d={arcPath(56, 172, start + 0.6, start + step - 0.6)}
                  fill={core.color}
                  fillOpacity={anySel ? 0.3 : 0.12}
                  stroke={core.color}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
                <text
                  x={lab.x}
                  y={lab.y}
                  transform={`rotate(${lab.rot} ${lab.x} ${lab.y})`}
                  textAnchor={lab.anchor}
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--mono)"
                  fill="var(--text)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {core.name}
                </text>
              </g>
            )
          })}
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="var(--mono)"
            fill="var(--text-mute)"
          >
            tap a family
          </text>
        </svg>
      </div>
    )
  }

  // focused view: the family's full vocabulary as rows of chips —
  // nuance on the left, its precise words after it
  return (
    <div className="family-panel">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <button className="btn-small btn-ghost" onClick={() => setFocused(null)}>
          ← all feelings
        </button>
        <WordChip
          word={focused.name}
          color={focused.color}
          selected={isSel(focused.name)}
          strong
          onClick={() => onToggle(focused.name)}
        />
      </div>
      {focused.children.map((m) => (
        <div key={m.name} className="family-row">
          <WordChip
            word={m.name}
            color={focused.color}
            selected={isSel(m.name)}
            strong
            onClick={() => onToggle(m.name)}
          />
          {m.children.map((w) => (
            <WordChip
              key={w}
              word={w}
              color={focused.color}
              selected={isSel(w)}
              onClick={() => onToggle(w)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
