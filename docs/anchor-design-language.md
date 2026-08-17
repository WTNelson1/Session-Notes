# Design brief — the "Anchor" aesthetic (harbor at night)

Sibling of `helm-design-language.md`. Anchor **inherits the Helm design language
wholesale** — read that file first; everything there applies unless overridden
here. This document records only what Anchor changes (its identity) and what it
adds (patterns Helm doesn't have). Together the two files define the shared
"personal OS" visual system: same structure and feel, distinct color identity
per app.

---

## Intent
Same calm, quietly technical instrument as Helm — but this one holds a person's
therapy journal, so it leans a degree warmer and softer. Brass instead of mint:
a lamp on dark water rather than a terminal cursor. Everything Helm says about
restraint, glanceability, and one-tap actions holds; Anchor additionally
optimizes for **zero-friction capture** (log a feeling in two taps, jot a topic
without leaving the home screen) because the whole app fails if capture feels
like work.

## Palette — the identity

Dark only. Indigo-tinted neutrals (never green-tinted like Helm, never pure
gray), one brass accent, the same soft salmon danger.

```css
:root {
  --bg:          #131523;  /* page — deep indigo-black */
  --bg-elev:     #1a1d30;  /* cards, panels */
  --bg-elev-2:   #22273f;  /* inputs, hover fills, nested surfaces */
  --line:        #363d61;  /* stronger hairline / hover border */
  --line-soft:   #242a47;  /* default hairline, dividers */
  --text:        #e7e9f3;  /* primary ink */
  --text-dim:    #9aa2c6;  /* secondary ink */
  --text-mute:   #667097;  /* labels, meta, placeholders */
  --accent:      #e8b64c;  /* brass — the ONLY "look here" color */
  --accent-soft: #a5832f;  /* accent borders / quieter accent */
  --accent-glow: rgba(232, 182, 76, 0.45);
  --danger:      #e88a7a;  /* soft salmon — shared with Helm */
}
```

Depth layer, same recipe as Helm with the hue swapped: two brass radial glows
in the top corners (`rgba(232,182,76,.045)` and `.03`), 3% film grain, and the
floating-matrix canvas (`floating-matrix-background.md`) with
`accent: [232, 182, 76]`, `count: 48` (fewer nodes than Helm — mobile-first).
The mesh reads as gold constellations over dark water.

**Suite rule:** every app in the personal OS keeps Helm's *language* and owns
its *palette*. Helm = green/mint. Anchor = indigo/brass. The next app takes a
third hue family (warm ember/rust suggested). The app switcher shows each app's
name beside a dot in its accent color — the palette *is* the wayfinding.

**Entity colors — used here for the feelings wheel.** The seven emotion
families carry the colors of the classic paper wheel, tuned to the dark
surface: fearful `#e8825a`, angry `#d4243f`, disgusted `#94a3b8`, sad `#5b8def`,
happy `#e0a44e`, surprised `#b094f0`, bad `#4cc38a`. Helm's rule holds: text
wears ink; a 6px dot or a tinted fill carries the family, never the text color.
The brass accent still means "selected / active" even on family-colored nodes.

## Typography, surfaces, iconography, interactions, motion, layout, voice
**Identical to Helm.** Geist Sans for content, Geist Mono for machinery, 10px
mono uppercase micro-labels with 0.22em tracking, 8px-radius cards with 1px
hairlines, no shadows / gradients / modals / toasts / icon libraries, inline
2-step `[sure?] [×]` confirms, ~2s "saved ✓" flashes, lowercase dry microcopy
with middle-dots. Fonts are bundled via `@fontsource/geist-sans` and
`@fontsource/geist-mono` so the PWA works offline.

Anchor's additions to the glyph vocabulary: `⌕` search · `⌗` bucket / file
under · `⤓` let it go · `↩` revive · `≣` sessions · `☰` prep · `✎` journal /
edit · `◉` today. `✦` remains the reserved AI prefix (summaries, reviews,
insights, "✦ thinking…").

## Patterns Anchor adds

- **Wordmark = home.** The lowercase mono wordmark with its pulsing accent dot
  is a link to the root route. (In the personal OS it becomes the app-switcher
  trigger.)
- **Non-sticky header.** The header scrolls with the page — no fill, no blur —
  so it never reads as a dark band over the corner glows.
- **Family wheel → mind-map nodes.** A 7-wedge SVG wheel for the top level
  (labels centered in the ring band, flipped on the left half so nothing is
  upside down); tapping a family swaps to rows of glowing pill "nodes" — parent
  on the left, smooth bezier connectors to its children on the right. Pills in
  each column share a uniform width (sized to the column's longest word).
  Family-tinted 1px border + 12% fill + faint glow; selected = brass border,
  30% fill, stronger glow. Never radial text in tight rings.
- **Instant search.** `⌕` in the box's top-right swaps to a type-ahead over the
  in-memory vocabulary: prefix matches first, then substring, results as the
  same pill nodes with the parent word in gray. Enter picks the top hit, clears,
  keeps focus. Sub-frame latency is a requirement, not a nicety.
- **Chips for selections.** Selected words collect as small mono pills with a
  family-color dot and `×`; today's already-logged words show as the same chips
  minus the `×`.
- **Bucketed lists.** Optional user-named groups render as mono micro-label
  section headers (`⌗ WORK · 3`); unfiled items sit above as an implicit inbox.
- **Tap-to-edit text.** Plain text becomes a borderless input on tap (dotted
  underline on hover as the hint); Enter/blur commits, Esc cancels.
- **Three-state list items.** Open · covered · let go. "Let go" is a distinct,
  collapsible, restorable state — never merged with covered and never a delete.
- **✦ derived views.** AI output (session summary, session review) renders as a
  brass-left-bordered quote block above the source, or in its own card below.
  It is layered *on top of* the human-authored note, never edited into it, and
  never clamped (summaries are already short — show them whole).
- **Outline editor.** Bulleted notes with Tab / Shift-Tab (or ⇤ ⇥ toolbar
  buttons on touch) for nesting; bullets fade with depth; stored as
  markdown-style text.

## Anti-patterns (Anchor-specific, on top of Helm's list)
Green-tinted grays or a mint accent (that's Helm) · a sticky header with its
own fill · radial text in narrow rings · ragged pill widths in a column ·
gating a capture action behind a button ("check in" → wheel) · any capture
path that waits on the network · AI text written back into a source note ·
emoji as UI (the one exception is none — the mood faces were retired).
