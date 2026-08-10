import { useState } from 'react'
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

/** radial label placement — flipped on the left half so text is never upside down.
 * Anchor is always 'start': unflipped text reads inner→outer, flipped reads
 * outer→inner, keeping the string inside the ring on both halves. */
function radialLabel(mid: number, rIn: number, rOut: number) {
  const flip = mid > 180
  const r0 = flip ? rOut - 7 : rIn + 7
  const rot = flip ? mid + 90 : mid - 90
  const p = polar(r0, mid)
  return { x: p.x, y: p.y, rot, anchor: 'start' as const }
}

function Segment({
  r1,
  r2,
  start,
  end,
  color,
  label,
  fontSize,
  selected,
  onClick,
}: {
  r1: number
  r2: number
  start: number
  end: number
  color: string
  label: string
  fontSize: number
  selected: boolean
  onClick: () => void
}) {
  const mid = (start + end) / 2
  const lab = radialLabel(mid, r1, r2)
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <path
        d={arcPath(r1, r2, start + 0.4, end - 0.4)}
        fill={color}
        fillOpacity={selected ? 0.38 : 0.1}
        stroke={selected ? 'var(--accent)' : color}
        strokeOpacity={selected ? 1 : 0.35}
        strokeWidth={selected ? 1.5 : 1}
      />
      <text
        x={lab.x}
        y={lab.y}
        transform={`rotate(${lab.rot} ${lab.x} ${lab.y})`}
        textAnchor={lab.anchor}
        dominantBaseline="middle"
        fontSize={fontSize}
        fontFamily="var(--mono)"
        fill={selected ? 'var(--text)' : 'var(--text-dim)'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
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

  // focused view: center = core word, inner ring = nuances, outer ring = precise words
  const mids = focused.children
  const step = 360 / mids.length
  return (
    <div className="wheel-wrap">
      <button className="btn-small btn-ghost" onClick={() => setFocused(null)}>
        ← all feelings
      </button>
      <svg viewBox="0 0 360 360">
        {mids.map((m, i) => {
          const start = i * step
          const end = start + step
          const segs = m.children.map((w, j) => {
            const wStart = start + (j * step) / m.children.length
            const wEnd = start + ((j + 1) * step) / m.children.length
            return (
              <Segment
                key={w + j}
                r1={104}
                r2={174}
                start={wStart}
                end={wEnd}
                color={focused.color}
                label={w}
                fontSize={9.5}
                selected={isSel(w)}
                onClick={() => onToggle(w)}
              />
            )
          })
          return (
            <g key={m.name}>
              <Segment
                r1={50}
                r2={100}
                start={start}
                end={end}
                color={focused.color}
                label={m.name}
                fontSize={10.5}
                selected={isSel(m.name)}
                onClick={() => onToggle(m.name)}
              />
              {segs}
            </g>
          )
        })}
        <g onClick={() => onToggle(focused.name)} style={{ cursor: 'pointer' }}>
          <circle
            cx={CX}
            cy={CY}
            r={44}
            fill={focused.color}
            fillOpacity={isSel(focused.name) ? 0.38 : 0.12}
            stroke={isSel(focused.name) ? 'var(--accent)' : focused.color}
            strokeOpacity={isSel(focused.name) ? 1 : 0.4}
            strokeWidth={isSel(focused.name) ? 1.5 : 1}
          />
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontFamily="var(--mono)"
            fill="var(--text)"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {focused.name}
          </text>
        </g>
      </svg>
    </div>
  )
}
