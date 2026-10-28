import Dexie, { type Table } from 'dexie'

export interface BaseRec {
  id: string
  createdAt: number
  updatedAt: number
  /** tombstone timestamp — deleted records are kept so deletions sync across devices */
  deleted?: number
}

export interface PrepItem extends BaseRec {
  text: string
  /** which therapy room this topic is for ('therapy', 'integration', 'group', …).
   * Tracks work like buckets: free lowercase tags, no registry. Only set on
   * top-level topics — sub-items follow their parent. Absent means the
   * original room (see DEFAULT_TRACK). */
  track?: string
  done: 0 | 1
  doneAt?: number
  /** set on sub-items: the id of the parent topic */
  parentId?: string
  /** optional user-named group for top-level topics (e.g. "work", "family") */
  bucket?: string
  /** "the moment passed" — retired without being discussed; kept, restorable */
  letGoAt?: number
  /** session-sheet override: which side of the new/carried split this topic
   * shows on. The split is guessed from createdAt vs the last note's createdAt,
   * and the guess is wrong when a note is written late — so the sheet lets you
   * shift a topic by hand. Scoped to one session id: once a newer note exists
   * the override expires and the guess takes over again. */
  sheetSection?: 'new' | 'carried'
  sheetSectionFor?: string
  /** session-sheet manual sort key. Unset means "sort by createdAt" (the two
   * share a scale — this starts life as a neighbour's createdAt and diverges
   * from there via swaps). Deliberately not session-scoped: an ordering
   * preference goes stale at worst, never wrong, so it is left standing. */
  sheetOrder?: number
}

export interface Session extends BaseRec {
  date: string // YYYY-MM-DD
  /** which therapy room this session happened in — see PrepItem.track */
  track?: string
  notes: string
  takeaways: string
  /** ✦ 1-2 sentence AI summary shown as the list preview */
  summary?: string
  /** hash of the text the summary was generated from, to skip regeneration */
  summaryHash?: string
  /** ✦ structured five-section review, generated for substantial notes */
  review?: string
  reviewHash?: string
}

export interface Practice extends BaseRec {
  title: string
  note: string
  active: 0 | 1
  sourceSessionId?: string
}

export interface PracticeLog extends BaseRec {
  practiceId: string
  date: string // YYYY-MM-DD
}

/** legacy 1-5 mood check-ins — kept so old synced data still round-trips */
export interface Mood extends BaseRec {
  at: number
  score: number // 1..5
  note: string
}

export interface JournalEntry extends BaseRec {
  at: number
  words: string[] // selected feelings-wheel words
  text: string
}

export interface Insight extends BaseRec {
  title: string
  content: string
}

/** A therapy room in the roster. The id IS the name. Rooms also exist
 * implicitly wherever sessions/topics carry their tag — this table only makes
 * one exist before its first record does (and across devices, since it syncs
 * as ordinary data; settings taught us not to bolt more fields onto the
 * settings blob). */
export interface Track extends BaseRec {}

class AnchorDB extends Dexie {
  prepItems!: Table<PrepItem, string>
  sessions!: Table<Session, string>
  practices!: Table<Practice, string>
  practiceLogs!: Table<PracticeLog, string>
  moods!: Table<Mood, string>
  insights!: Table<Insight, string>
  journal!: Table<JournalEntry, string>
  tracks!: Table<Track, string>

  constructor() {
    super('anchor')
    this.version(1).stores({
      prepItems: 'id, done, updatedAt',
      sessions: 'id, date, updatedAt',
      practices: 'id, active, updatedAt',
      practiceLogs: 'id, practiceId, date, updatedAt',
      moods: 'id, at, updatedAt',
      insights: 'id, createdAt, updatedAt',
    })
    this.version(2).stores({
      journal: 'id, at, updatedAt',
    })
    this.version(3).stores({
      tracks: 'id, updatedAt',
    })
  }
}

export const db = new AnchorDB()

export const TABLES = [
  'prepItems',
  'sessions',
  'practices',
  'practiceLogs',
  'moods',
  'insights',
  'journal',
  'tracks',
] as const
export type TableName = (typeof TABLES)[number]

export function newRec(): BaseRec {
  const now = Date.now()
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}

export function alive<T extends BaseRec>(r: T): boolean {
  return !r.deleted
}

/** The room everything predating tracks belongs to, and the fallback whenever
 * a record arrives without one (an old build's edit, an un-run backfill), so
 * untagged never means a phantom extra room. Deliberately a generic word: this
 * repo gets forked, and a fork must not inherit anyone's therapist by name.
 * (Existing data is unaffected — the backfill stamped it explicitly.) */
export const DEFAULT_TRACK = 'therapy'

export function trackOf(r: { track?: string }): string {
  return r.track || DEFAULT_TRACK
}

/** Make a room exist by name, now and on every synced device. Idempotent;
 * reviving a soft-deleted entry is deliberate (re-adding = un-deleting). */
export async function ensureTrack(name: string) {
  const now = Date.now()
  const existing = await db.tracks.get(name)
  if (existing && !existing.deleted) return
  await db.tracks.put({ id: name, createdAt: existing?.createdAt ?? now, updatedAt: now })
}

/** One-time per device: stamp pre-track sessions and topics explicitly, so the
 * tag rides sync instead of living only in trackOf()'s fallback. Idempotent —
 * a device that pulls already-stamped records stamps nothing. */
export async function backfillTracks() {
  try {
    if (localStorage.getItem('anchor.tracksBackfilled')) return
  } catch {
    return
  }
  const now = Date.now()
  await db.transaction('rw', db.sessions, db.prepItems, async () => {
    for (const s of await db.sessions.toArray())
      if (!s.deleted && !s.track) await db.sessions.update(s.id, { track: DEFAULT_TRACK, updatedAt: now })
    for (const t of await db.prepItems.toArray())
      if (!t.deleted && !t.parentId && !t.track)
        await db.prepItems.update(t.id, { track: DEFAULT_TRACK, updatedAt: now })
  })
  try {
    localStorage.setItem('anchor.tracksBackfilled', '1')
  } catch {
    // storage unavailable — it will simply run again next launch, harmlessly
  }
}

/**
 * A prep topic still in play — neither covered nor let go. `letGoAt` was added
 * after most of these lists were written, and only Prep learned about it, so
 * every other surface kept offering topics the user had already released. Keep
 * the test here: the queue has to mean the same thing everywhere it appears.
 */
export function stillOpen(p: PrepItem): boolean {
  return !p.done && !p.letGoAt
}

export async function patch<T extends BaseRec>(
  table: Table<T, string>,
  id: string,
  changes: Partial<T>,
) {
  await table.update(id, (obj: T) => {
    Object.assign(obj, changes, { updatedAt: Date.now() })
  })
}

export async function softDelete<T extends BaseRec>(table: Table<T, string>, id: string) {
  const now = Date.now()
  await table.update(id, (obj: T) => {
    Object.assign(obj, { deleted: now, updatedAt: now })
  })
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
