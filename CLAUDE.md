# Anchor — private therapy-notes PWA

Local-first PWA: session prep (bucketed topics with sub-items, "let go" state), outline-style session notes with AI ✦ summaries and five-section reviews, feelings-wheel journal (Roberts wheel, mind-map drill-in, instant search), practices tracker, and Claude-powered insights.

## Stack
Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · `@anthropic-ai/sdk` in-browser (Opus 5 with Opus 4.8 server-side fallback) · encrypted sync to a private GitHub gist (AES-256-GCM, passphrase-derived key).

## Where things live
- `src/db.ts` — schema (soft deletes via `deleted` tombstones; every record has `updatedAt` for LWW merge)
- `src/sync.ts` — gist sync + auto-sync hooks; API key & about-me ride inside the encrypted blob
- `src/ai.ts` — all Claude calls: insights (streamed), session summary, session review; `aboutBlock()` appends the user's context to every system prompt
- `src/feelings.ts` — the wheel taxonomy + flat search index
- `src/components/FeelingsWheel.tsx` — family wheel → mind-map nodes → ⌕ search
- `src/pages/*` — Today (quick-action hub), Journal, Prep, Sessions, Practices, Insights, Settings, Checkin
- `docs/` — Helm design language + floating-matrix background briefs (the visual system this app follows)

## Conventions
- **Design language is Helm** (see `docs/helm-design-language.md`); Anchor's palette is "harbor at night" (indigo + brass) — deliberately distinct from Helm's green/mint. Mono micro-labels, hairlines, glyphs not icons, lowercase microcopy, inline 2-step confirms, no modals/toasts.
- Notes go to the Claude API only on explicit user actions (run insight, save/open a session note, tap a summarize button) — never silently in the background. Keep it that way and keep the Settings copy honest about it.
- AI features layer *derived* views (summary, review) on top of human-authored source; never let AI rewrite the source note.
- User's about-me context (Settings) is appended to every AI system prompt; prompts must address the user as "you" and never guess pronouns.

## Dev / deploy
- `npm run dev` (port 5173) · `npm run build` must pass before commit
- Push to `main` deploys via GitHub Actions to https://wtnelson1.github.io/Session-Notes/ (Pages source = GitHub Actions; workflow sets `BASE_PATH`)
- Verify deploys: `gh run list --limit 1`
