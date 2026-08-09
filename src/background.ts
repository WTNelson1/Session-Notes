// Floating-matrix ambient background — node-and-line mesh on a fixed canvas
// behind all content. Decoration only: pointer-events none, never load-bearing.

interface Options {
  accent: [number, number, number]
  count: number
  linkDist: number
  speed: number
  baseAlpha: number
  scrollAlpha: number
  parallax: number
}

export function initBackground(opts: Partial<Options> = {}) {
  const o: Options = {
    accent: [122, 214, 192],
    count: 48,
    linkDist: 180,
    speed: 0.18,
    baseAlpha: 0.1,
    scrollAlpha: 0.16,
    parallax: 0.12,
    ...opts,
  }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches

  const canvas = document.createElement('canvas')
  canvas.className = 'grid-bg'
  document.body.prepend(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const [r, g, b] = o.accent

  interface Node {
    x: number
    y: number
    vx: number
    vy: number
    depth: number
  }

  let w = 0
  let h = 0
  let dpr = 1
  let nodes: Node[] = []
  let scroll = 0
  let target = 0

  // deterministic pseudo-random so the field is stable across reloads
  const rand = (s: number) => (Math.sin(s * 12.9898) * 43758.5453) % 1

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = canvas.width = innerWidth * dpr
    h = canvas.height = innerHeight * dpr
    canvas.style.width = innerWidth + 'px'
    canvas.style.height = innerHeight + 'px'
  }

  function seed() {
    nodes = []
    for (let i = 0; i < o.count; i++) {
      nodes.push({
        x: Math.abs(rand(i + 1)) * innerWidth,
        y: Math.abs(rand(i + 7.3)) * innerHeight,
        vx: (rand(i + 2.1) - 0.5) * o.speed,
        vy: (rand(i + 5.7) - 0.5) * o.speed,
        depth: 0.4 + Math.abs(rand(i + 9.4)) * 0.9,
      })
    }
  }

  function frame() {
    if (!ctx) return
    if (!still) scroll += (target - scroll) * 0.08
    const docH = Math.max(1, document.body.scrollHeight - innerHeight)
    const prog = Math.min(1, Math.max(0, scroll / docH))

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(dpr, dpr)
    const linkA = o.baseAlpha + prog * o.scrollAlpha

    if (!still) {
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = innerWidth + 20
        if (n.x > innerWidth + 20) n.x = -20
        if (n.y < -20) n.y = innerHeight + 20
        if (n.y > innerHeight + 20) n.y = -20
      }
    }
    const pts = nodes.map((n) => ({
      x: n.x,
      y: n.y - ((scroll * o.parallax * n.depth) % (innerHeight + 40)),
      depth: n.depth,
    }))

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        if (d < o.linkDist) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d / o.linkDist) * linkA})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(pts[j].x, pts[j].y)
          ctx.stroke()
        }
      }
    }
    for (const n of pts) {
      ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + prog * 0.35})`
      ctx.beginPath()
      ctx.arc(n.x, n.y, 1.6 * n.depth + 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    if (!still) requestAnimationFrame(frame)
  }

  addEventListener('resize', () => {
    resize()
    seed()
  })
  addEventListener('scroll', () => {
    target = window.scrollY
  }, { passive: true })
  resize()
  seed()
  requestAnimationFrame(frame)
}
