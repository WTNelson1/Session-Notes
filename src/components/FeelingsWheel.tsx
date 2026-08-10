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

/** radial label, centered in the ring; flipped on the left half so text is
 * never upside down */
function radialLabel(mid: number, rIn: number, rOut: number) {
  const flip = mid > 180
  const rot = flip ? mid + 90 : mid - 90
  const p = polar((rIn + rOut) / 2, mid)
  return { x: p.x, y: p.y, rot, anchor: 'middle' as const }
}

function FeelNode({
  word,
  color,
  selected,
  parent = false,
  widthCh,
  onClick,
}: {
  word: string
  color: string
  selected: boolean
  parent?: boolean
  /** uniform column width, in ch of the longest word in the column */
  widthCh?: number
  onClick: () => void
}) {
  const style: CSSProperties = { '--fam': color } as CSSProperties
  if (widthCh) {
    style.width = `calc(${widthCh}ch + 30px)`
    style.justifyContent = 'center'
  }
  return (
    <button
      className={`feel-node ${selected ? 'sel' : ''} ${parent ? 'parent' : ''}`}
      style={style}
      onClick={onClick}
    >
      {word}
    </button>
  )
}

const PILL_H = 33
const PILL_GAP = 7

/** smooth bezier branches from the parent node to each child node */
function Connector({ n, color }: { n: number; color: string }) {
  const h = n * PILL_H + (n - 1) * PILL_GAP
  const y0 = h / 2
  return (
    <svg
      className="node-connector"
      width={34}
      height={h}
      viewBox={`0 0 34 ${h}`}
      style={{ filter: `drop-shadow(0 0 3px ${color}59)` }}
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => {
        const y1 = PILL_H / 2 + i * (PILL_H + PILL_GAP)
        return (
          <path
            key={i}
            d={`M 0 ${y0} C 18 ${y0}, 16 ${y1}, 34 ${y1}`}
            fill="none"
            stroke={color}
            strokeOpacity={0.45}
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
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

  // focused view: the family as a glowing mind-map — nuance node on the
  // left, curved branches out to its precise words. Columns are sized to
  // the family's longest word so the pills align.
  const parentW = Math.max(...focused.children.map((m) => m.name.length))
  const childW = Math.max(...focused.children.flatMap((m) => m.children.map((w) => w.length)))
  return (
    <div className="family-panel">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <button className="btn-small btn-ghost" onClick={() => setFocused(null)}>
          ← all feelings
        </button>
        <FeelNode
          word={focused.name}
          color={focused.color}
          selected={isSel(focused.name)}
          parent
          onClick={() => onToggle(focused.name)}
        />
      </div>
      {focused.children.map((m) => (
        <div key={m.name} className="node-group">
          <FeelNode
            word={m.name}
            color={focused.color}
            selected={isSel(m.name)}
            parent
            widthCh={parentW}
            onClick={() => onToggle(m.name)}
          />
          <Connector n={m.children.length} color={focused.color} />
          <div className="node-children">
            {m.children.map((w) => (
              <FeelNode
                key={w}
                word={w}
                color={focused.color}
                selected={isSel(w)}
                widthCh={childW}
                onClick={() => onToggle(w)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
