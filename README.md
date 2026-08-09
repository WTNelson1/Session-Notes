# Anchor — private therapy notes

A local-first PWA for therapy: session prep you check off, session notes, between-session practices, one-tap mood check-ins, and Claude-powered insights over your own journal.

**Privacy model:** everything lives in your browser's IndexedDB. Data leaves the device only two ways, both explicit:

- **Sync** — an AES-256-GCM-encrypted snapshot (key derived from your passphrase, never uploaded) is stored in a private GitHub gist so your devices stay in sync.
- **AI insights** — when *you* run an analysis, the selected notes are sent to Anthropic's Claude API using your own API key.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. Create a GitHub repository (private is fine — GitHub Pages works on private repos with a paid plan; on the free plan the *repo serving Pages* must be public, but your notes are never in the repo, only app code).
2. Push this project to it (branch `main`).
3. In the repo: **Settings → Pages → Source: GitHub Actions.**
4. The included workflow builds and deploys on every push. Your app will be at `https://<user>.github.io/<repo>/`.
5. Open that URL on each device → browser menu → **Add to Home Screen / Install**.

## First-run setup (in the app's Settings screen)

- **AI:** paste an Anthropic API key from console.anthropic.com.
- **Sync:** paste a GitHub token (classic, `gist` scope only) + choose a passphrase → Sync now. On other devices, enter the same token + passphrase + the gist ID.
- **Mood check-in:** copy the `/checkin` link into an iOS Shortcuts time-of-day automation for a friction-free daily prompt.

## Stack

Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · @anthropic-ai/sdk (browser, streaming) · GitHub Gist API for encrypted sync.
