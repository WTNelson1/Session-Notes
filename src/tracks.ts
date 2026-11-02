import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, trackOf, DEFAULT_TRACK, type Track } from './db'

export interface TrackUsage {
  sessions: number
  topics: number
}

/** Which room new things start in. An explicit ★ wins — newest star, so two
 * devices starring different rooms settle on the last one tapped. Unstarred,
 * it is the busiest room: right for anyone who never opens the setting, and
 * never conjures an empty room nobody uses. */
export function pickDefault(roster: Track[], usage: Map<string, TrackUsage>): string {
  const starred = roster
    .filter((t) => t.defaultAt)
    .sort((a, b) => (b.defaultAt ?? 0) - (a.defaultAt ?? 0))[0]
  if (starred) return starred.id
  let best = DEFAULT_TRACK
  let most = 0
  for (const [name, u] of [...usage].sort(([a], [b]) => a.localeCompare(b))) {
    const n = u.sessions + u.topics
    if (n > most) {
      best = name
      most = n
    }
  }
  return best
}

/** Every room that exists anywhere — the saved roster plus any tag a session or
 * topic carries — with the default and per-room counts. One read so every
 * picker in the app agrees on the list. */
export function useTracks() {
  const data = useLiveQuery(async () => ({
    roster: (await db.tracks.toArray()).filter(alive),
    sessions: (await db.sessions.toArray()).filter(alive),
    tops: (await db.prepItems.toArray()).filter((p) => alive(p) && !p.parentId),
  }))
  const usage = new Map<string, TrackUsage>()
  const bump = (name: string, key: keyof TrackUsage) => {
    const u = usage.get(name) ?? { sessions: 0, topics: 0 }
    u[key]++
    usage.set(name, u)
  }
  for (const s of data?.sessions ?? []) bump(trackOf(s), 'sessions')
  for (const p of data?.tops ?? []) bump(trackOf(p), 'topics')
  const roster = data?.roster ?? []
  const known = [...new Set([...roster.map((t) => t.id), ...usage.keys()])].sort()
  return {
    ready: !!data,
    known,
    usage,
    roster,
    defaultTrack: pickDefault(roster, usage),
    /** true only for a ★ someone tapped, not the busiest-room fallback */
    starred: roster.some((t) => t.defaultAt),
  }
}
