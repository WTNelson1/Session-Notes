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
  done: 0 | 1
  doneAt?: number
  /** set on sub-items: the id of the parent topic */
  parentId?: string
  /** optional user-named group for top-level topics (e.g. "work", "vic") */
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
}

export interface Session extends BaseRec {
  date: string // YYYY-MM-DD
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

class AnchorDB extends Dexie {
  prepItems!: Table<PrepItem, string>
  sessions!: Table<Session, string>
  practices!: Table<Practice, string>
  practiceLogs!: Table<PracticeLog, string>
  moods!: Table<Mood, string>
  insights!: Table<Insight, string>
  journal!: Table<JournalEntry, string>

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
] as const
export type TableName = (typeof TABLES)[number]

export function newRec(): BaseRec {
  const now = Date.now()
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}

export function alive<T extends BaseRec>(r: T): boolean {
  return !r.deleted
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
