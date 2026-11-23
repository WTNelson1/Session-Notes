import { db, patch, stillOpen, trackOf, type PrepItem } from './db'

// One order for the prep queue — prep, the session sheet and a session's
// check-off list all read it, so arranging it once holds. Lower rank sits
// nearer the top. Unarranged topics rank by createdAt, so the queue reads in
// the order you added things and a new one joins at the bottom.
// (Today's preview is the exception: it shows the newest few, see Today.tsx.)

export const rankOf = (t: PrepItem) => t.queuePos ?? t.createdAt

/** Queue order, exactly as prep lays it out: by track, then unfiled topics
 * before filed ones, buckets alphabetically, then rank (top first). The
 * flat views — the sheet, the check-off list — must use this too, or a
 * bucket of newer topics jumps above the ones you put first. */
export function byRank(a: PrepItem, b: PrepItem): number {
  return (
    trackOf(a).localeCompare(trackOf(b)) ||
    Number(!!a.bucket) - Number(!!b.bucket) ||
    (a.bucket ?? '').localeCompare(b.bucket ?? '') ||
    rankOf(a) - rankOf(b)
  )
}

/** Move list[i] one place up (dir -1) or down (+1) by swapping ranks with
 * that neighbour: two writes, nothing else moves. `list` is whatever group
 * is on screen, already sorted by byRank. */
export function nudge(list: PrepItem[], i: number, dir: -1 | 1) {
  const a = list[i]
  const b = list[i + dir]
  if (!a || !b) return
  const ka = rankOf(a)
  let kb = rankOf(b)
  // same instant (a bulk add) — tip the tie so the swap actually shows
  if (ka === kb) kb += dir
  void patch(db.prepItems, a.id, { queuePos: kb })
  void patch(db.prepItems, b.id, { queuePos: ka })
}

/**
 * The queue used to run newest-first, with manual moves stored in
 * `sheetOrder` (higher = nearer the top). It now runs oldest-first. A group
 * nobody arranged simply flips to the order things were added; a group that
 * was arranged keeps exactly the order it had on screen, rewritten into
 * `queuePos` using the group's own old keys (so every value stays below any
 * future createdAt and new topics still land at the bottom).
 *
 * Idempotent and deterministic: it only acts on groups that still hold an
 * open topic with a legacy `sheetOrder` and no `queuePos`, and clears
 * `sheetOrder` as it goes — a second device running it on the same old data
 * writes the same values.
 */
export async function migrateQueueOrder() {
  const legacyKey = (t: PrepItem) => t.sheetOrder ?? t.createdAt
  await db.transaction('rw', db.prepItems, async () => {
    const open = (await db.prepItems.toArray()).filter(
      (t) => !t.deleted && !t.parentId && stillOpen(t),
    )
    const groups = new Map<string, PrepItem[]>()
    for (const t of open) {
      const k = `${trackOf(t)}\u0000${t.bucket ?? ''}`
      groups.set(k, [...(groups.get(k) ?? []), t])
    }
    const now = Date.now()
    for (const g of groups.values()) {
      if (!g.some((t) => t.sheetOrder != null && t.queuePos == null)) continue
      const onScreen = [...g].sort((a, b) => legacyKey(b) - legacyKey(a))
      const keys = g.map(legacyKey).sort((a, b) => a - b)
      for (let i = 0; i < onScreen.length; i++) {
        await db.prepItems.update(onScreen[i].id, (obj: PrepItem) => {
          obj.queuePos = keys[i] + i * 1e-3 // ties (bulk adds) stay ordered
          delete obj.sheetOrder
          obj.updatedAt = now
        })
      }
    }
  })
}
