# Design brief — the "Helm" aesthetic (dark mint terminal)

Drop this file into another project (e.g. `docs/design-language.md` or paste into
`CLAUDE.md`). It fully specifies a reusable visual language: palette, type,
surfaces, component recipes, interaction patterns, motion, and voice. Written for
a PWA but applies to any web UI. Pairs with `floating-matrix-background.md` for
the ambient canvas layer — copy that file too if you want the full effect.

---

## Intent
A calm, dark, quietly technical instrument — "a terminal that learned manners."
Low-noise and glanceable: state is carried by tiny dots, hairlines, and micro-
labels rather than boxes, banners, and badges. Optimized for focus (originally
ADHD-tuned): the screen should never shout, nothing moves unless it means
something, and every common action is one tap on the row where you already are.
Restraint is the whole point.

## Palette

Dark only. One neutral ramp of deep green-blacks, one mint accent, one soft
danger. All grays are green-tinted — never pure gray.

```css
:root {
  --bg:          #081915;  /* page — deep green-black */
  --bg-elev:     #0e2520;  /* cards, panels */
  --bg-elev-2:   #143029;  /* inputs, hover fills, nested surfaces */
  --line:        #244038;  /* stronger hairline / hover border */
  --line-soft:   #19302a;  /* default hairline, dividers */
  --text:        #dfeee8;  /* primary ink */
  --text-dim:    #8fb8ad;  /* secondary ink */
  --text-mute:   #5a7d75;  /* labels, meta, placeholders */
  --accent:      #7ad6c0;  /* mint — the ONLY "look here" color */
  --accent-soft: #3a9985;  /* accent borders / quieter accent */
  --accent-glow: rgba(122, 214, 192, 0.45);
  --danger:      #e88a7a;  /* soft salmon — warning, never alarm-red */
  --grain-opacity: 0.03;
}
```

Rules:
- **Accent = "now / active / go".** Focus indicators, primary buttons, active
  states, AI affordances. Never decorative. If everything is mint, nothing is.
- **Danger is soft.** Destructive hovers and warnings use the salmon, and
  destructive actions confirm inline (see Interactions) — no red banners.
- **Entity colors** (categories/clients/projects the user defines) are runtime
  hex values applied via inline `style`, not compiled classes. Curated picker
  palette that sits well on the dark surface:
  `#b094f0 #8b5cf6 #5b8def #08b0d5 #4cc38a #97c05c #e0a44e #e8825a #d4243f #e3447c #c084c8 #94a3b8`
- **Text wears ink, not entity color** — a 6px dot or 2px border carries the
  entity's identity next to normally-colored text. (Entity-colored text is
  allowed only for section headers *of* that entity.)

Optional depth: two faint accent radial glows in the top page corners
(`rgba(122,214,192,.05)` and `.035`, transparent by 40%), plus a fixed
film-grain overlay at 3% opacity (SVG turbulence noise, `pointer-events:none`,
high z-index).

## Typography

Two faces, hard roles. Geist Sans + Geist Mono (or Inter + JetBrains Mono as
fallbacks).

- **Sans = content.** Task/body text 14–14.5px; page titles ~24px
  `tracking-tight`, weight 400–500 (never bolder).
- **Mono = machinery.** Every label, button, chip, count, date, and unit of
  meta. Lowercase in buttons/microcopy.
- **The signature move — micro-labels:** section headers are
  `10px mono UPPERCASE tracking 0.2–0.25em` in `--text-mute`. e.g.
  `TREND · LAST 30 DAYS · DAILY`. Middle-dot `·` separates label segments.
- Meta/counts: 10–11px mono in `--text-mute`. Enable `ss01`/`cv11` features and
  antialiasing if available.

## Surfaces & shape

- Card: `bg --bg-elev`, 1px `--line-soft` border, 8px radius. Lists inside
  cards are hairline-divided rows (`divide-y` in `--line-soft`), not gapped
  boxes.
- Entity-owned cards get a 2px **top** border in the entity color; list rows
  get a 2px **left** border (entity color, or accent for "active now").
- Inputs: `--bg-elev-2` fill, `--line-soft` border, 4–6px radius; focus swaps
  the border to `--accent-soft`. No focus rings/glows.
- No drop shadows (exception: floating popovers may use one), no gradients
  (exceptions: the corner glows, and a single subtle accent-tinted sweep on the
  one "current focus" hero card), no glassmorphism. Backdrop-blur only on
  sticky navs over content (`bg/90 + backdrop-blur`).

## Component recipes (Tailwind-style)

- **Standard button/chip**
  `text-[11px] font-mono px-2.5 py-1.5 rounded border border-line-soft
  text-text-dim hover:border-line hover:text-text transition-colors`
- **Primary (outline accent)** — swap to
  `border-accent-soft text-accent hover:bg-accent-soft/10`
- **Solid CTA** (rare — one per screen max): `bg-accent text-bg hover:opacity-90`
- **Active chip/filter**: `border-accent-soft text-accent bg-bg-elev`
- **Destructive hover**: `text-text-mute hover:border-danger hover:text-danger`
- **Filter chip rows**: small chips in a wrapping flex row; selected = active
  recipe; tapping the active chip clears it.
- **List row**: `flex items-center gap-3 px-4 py-3` + entity dot
  (`w-1.5 h-1.5 rounded-full`, inline bg color) + truncating title + right-side
  meta in 11px mono + hover-revealed row actions.
- **Stat card**: micro-label, then ~24px number, then 11px mono sub-line.
- **Empty state**: one quiet line of 12–13px mono in `--text-mute`
  (`nothing matches "stale".`) — optionally one outline-accent CTA. Never
  illustrations.

## Iconography

No icon library. A small glyph vocabulary, used consistently, in text: `＋` add,
`×` remove/close, `↩` undo/restore, `↻` repeats, `◎/◉` focus (off/on), `★`
star/select, `✶` needs-attention (danger color), `▾` collapse, `⚙` settings,
`✦` **reserved prefix for AI-powered actions**, `·` separator. A pulsing accent
dot is the "live / right now" indicator. Tiny age-dots (3px, one per day
waiting, capped) are preferred over "3 days old" text.

## Interactions

- **Everything inline. No modal dialogs.** Panels expand in place; pickers are
  small anchored popovers at most.
- **Destructive = 2-step inline confirm**: the control swaps to
  `[sure?] [×]` (danger-styled) — no browser confirm except where a control is
  physically too small to swap (a bare checkbox).
- **Hover-reveal row actions**: `opacity-0 group-hover:opacity-100` on desktop;
  on touch screens the same controls sit at `opacity-60` (never fully hidden —
  there is no hover on a phone).
- **Optimistic UI** for toggles (with rollback on failure); brief inline
  "saved ✓" / "scheduled ✓" flashes (~2s) instead of toasts. No toast library.
- **Autosave on blur** for inline edits; Enter commits. Titles/notes edit
  in place as borderless transparent inputs that reveal a hairline underline on
  focus.
- Whole-header click toggles collapse; chevron rotates -90° when closed.
- Segmented ranges/toggles are chip groups, not sliders or dropdowns.

## Motion

Almost none, and always meaningful: `transition-colors` on everything
interactive; one slow pulse (~2.4s ease-in-out scale+glow) on the "live"
dot; collapse chevron rotation. Respect `prefers-reduced-motion`. The optional
ambient layer (see `floating-matrix-background.md`) is the only large-scale
motion and sits behind everything at ~10% opacity.

## Layout

- Content column `max-w-2xl` centered (shell up to `max-w-6xl`); generous
  vertical rhythm (`mb-6`/`mb-8` between sections). Vertical space is cheap;
  horizontal cramming is not.
- **Desktop nav**: slim sticky top bar — wordmark + folder-tab-shaped links
  (SVG trapezoid tabs, active tab filled `--bg-elev-2` with accent outline).
- **Mobile nav**: fixed bottom bar, 5 cells max: glyph + 10px mono uppercase
  label; active cell = accent text + short accent bar along the top edge.
  `backdrop-blur`, safe-area padding.
- PWA: standalone display, theme color = `--bg`, dark only (no theme toggle).

## Voice

Microcopy is lowercase, mono, dry, and kind: "quick add to today's sticky…",
"no reply for 9d — chase it, or let it go.", "showing the 100 most recent · ↓
export has everything". Sentence fragments over sentences; middle-dots over
commas; no exclamation marks; never scolds the user. Buttons are verbs
("logged", "revive", "chase"), one or two words.

## Anti-patterns (instant tells the aesthetic broke)

Pure black or pure gray backgrounds · rainbow entity colors on text · toasts ·
modals · drop-shadowed cards · icon libraries · bold weights above 500 ·
uppercase sans headlines · alarm-red · loading skeletons (use one small pulsing
dot) · more than one solid-accent CTA per screen · decorative animation.
