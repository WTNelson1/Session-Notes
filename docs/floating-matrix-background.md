# Design brief — "Floating Matrix" animated background

Drop this file into another project (e.g. as `docs/floating-matrix-background.md`
or paste into `CLAUDE.md`). It fully specifies a reusable scroll-reactive
node-and-line background: intent, visual spec, motion spec, a drop-in vanilla JS
module, CSS, integration steps, and tuning knobs.

---

## Intent
A subtle, living **node-and-line network** on a full-viewport `<canvas>` behind all
content. Reads as a faint constellation / mesh that drifts slowly and **reacts to
scroll** — parallaxing and brightening as the user moves down the page. Adds depth
and a "systems / technical" feel without distracting from foreground UI. It is
decoration only: never interactive, never load-bearing.

## Look & feel
- **One accent color**, single hue, low opacity. Dots and connecting lines share the
  same color; only opacity varies.
- **Dots**: small (1–3px), sparse (~60 across a 1440×900 viewport). Depth-varied
  sizes for a faux-3D field.
- **Lines**: drawn only between nodes closer than a threshold (~190px); line opacity
  fades with distance, so the mesh looks organic, not a rigid grid.
- **Canvas background is transparent** — it sits over the page's own (dark) bg. Pair
  with two faint radial-gradient glows in the page's top corners (CSS) for depth.
- **Flat**: no blur, no shadows, no gradients on the canvas. Crisp 1px lines.
- Barely-there at the top (~10% link opacity), only mildly more present at the
  bottom (~26%). Restraint is the whole point.

## Motion & interaction
- **Idle drift**: each node has a tiny constant velocity (~0.18px/frame) and wraps
  around the edges. Continuous, calm, never jittery.
- **Scroll parallax**: nodes shift vertically as you scroll, scaled by each node's
  `depth` — deeper nodes move less. Layered depth.
- **Scroll easing**: the tracked scroll value *lerps* toward the real scroll position
  (`scroll += (target - scroll) * 0.08`) so motion feels smooth and slightly weighted.
- **Scroll-progress brightness**: `progress = scrollY / (docHeight - viewport)` (0→1).
  Link and dot opacity increase with progress — the field intensifies toward the bottom.
- **60fps** via `requestAnimationFrame`; the scroll listener is passive and only
  stores a target (no layout work in the handler).

## Drop-in implementation (vanilla, framework-agnostic)

```js
// background.js — floating-matrix animated background.
// Usage: import { initBackground } from "./background.js"; initBackground();
//        or initBackground({ accent: [R, G, B] }) to rebrand.
export function initBackground(opts = {}) {
  const o = {
    accent: [61, 214, 176], // RGB of the single accent hue
    count: 64,              // node count (across ~1440px; scale to taste)
    linkDist: 190,          // px: connect nodes closer than this
    speed: 0.18,            // idle drift px/frame
    baseAlpha: 0.10,        // link opacity at top of page
    scrollAlpha: 0.16,      // extra link opacity gained by page bottom
    parallax: 0.12,         // vertical shift per scroll px (x node depth)
    ...opts,
  };
  // Respect reduced-motion: render one static frame, no animation loop.
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "grid-bg";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const [r, g, b] = o.accent;

  let w, h, dpr, nodes = [], scroll = 0, target = 0;

  // Deterministic pseudo-random so the field is stable across reloads.
  const rand = (s) => (Math.sin(s * 12.9898) * 43758.5453) % 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }
  function seed() {
    nodes = [];
    for (let i = 0; i < o.count; i++) nodes.push({
      x: Math.abs(rand(i + 1)) * innerWidth,
      y: Math.abs(rand(i + 7.3)) * innerHeight,
      vx: (rand(i + 2.1) - 0.5) * o.speed,
      vy: (rand(i + 5.7) - 0.5) * o.speed,
      depth: 0.4 + Math.abs(rand(i + 9.4)) * 0.9, // 0.4-1.3 parallax factor
    });
  }
  function frame() {
    if (!still) scroll += (target - scroll) * 0.08;
    const docH = Math.max(1, document.body.scrollHeight - innerHeight);
    const prog = Math.min(1, Math.max(0, scroll / docH));

    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.scale(dpr, dpr);
    const linkA = o.baseAlpha + prog * o.scrollAlpha;

    if (!still) for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = innerWidth + 20; if (n.x > innerWidth + 20) n.x = -20;
      if (n.y < -20) n.y = innerHeight + 20; if (n.y > innerHeight + 20) n.y = -20;
    }
    const pts = nodes.map((n) => ({
      x: n.x,
      y: n.y - (scroll * o.parallax * n.depth) % (innerHeight + 40),
      depth: n.depth,
    }));

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < o.linkDist) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d / o.linkDist) * linkA})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    for (const n of pts) {
      ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + prog * 0.35})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.6 * n.depth + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("resize", () => { resize(); seed(); });
  addEventListener("scroll", () => { target = window.scrollY; }, { passive: true });
  resize(); seed(); requestAnimationFrame(frame);
}
```

## CSS

```css
canvas.grid-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

/* All page content must sit above the canvas: */
.your-content-wrapper { position: relative; z-index: 1; }

/* Optional depth glows on the page background (match accent, very low alpha): */
body {
  background-image:
    radial-gradient(circle at 12% -5%, rgba(61,214,176,.06), transparent 40%),
    radial-gradient(circle at 90% 0%, rgba(61,214,176,.04), transparent 35%);
  background-attachment: fixed;
}
```

## Integration (3 steps)
1. Add the CSS. Give your main content container `position: relative; z-index: 1`
   so it renders above the canvas.
2. `import { initBackground } from "./background.js";` and call `initBackground()`
   once on load — or `initBackground({ accent: [R, G, B] })` to rebrand.
3. Confirm the canvas stays `pointer-events: none` so clicks pass through to your UI.

## Tuning parameters
| Option | Default | Effect |
|---|---|---|
| `accent` | `[61,214,176]` | The single hue (RGB). Swap for your brand color. |
| `count` | `64` | Node density. More = busier mesh (links are O(n^2) — watch perf). |
| `linkDist` | `190` | Connection radius. Larger = denser web. |
| `speed` | `0.18` | Idle drift rate. Lower = calmer. |
| `baseAlpha` / `scrollAlpha` | `0.10` / `0.16` | Link opacity at top / extra gained at bottom. |
| `parallax` | `0.12` | Scroll-driven vertical shift per node depth. `0` = no parallax. |

## Performance & accessibility notes
- Links are **O(n^2)** per frame — keep `count` <= ~80. `dpr` is capped at 2. For
  higher counts, add a spatial grid to avoid all-pairs distance checks.
- `requestAnimationFrame` only; the scroll handler is **passive** and does zero layout.
- **`prefers-reduced-motion`** renders a single static frame and skips the loop.
- Purely decorative: no text, no semantics, `pointer-events: none`, no ARIA needed.
  Never put meaningful content in the canvas.
- Single-hue, low-opacity is the trick — resist adding more colors or glow; the
  restraint is what makes it read as "premium ambient" rather than a screensaver.
