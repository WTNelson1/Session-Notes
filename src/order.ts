import { db, patch, trackOf, type PrepItem } from './db'

// One order for the prep queue everywhere it appears — prep, the session
// sheet, today, a session's check-off list — so arranging it once holds.
// Higher rank sits nearer the top. Unarranged topics rank by createdAt, so a
// new one lands on top until it is moved.

export const rankOf = (t: PrepItem) => t.sheetOrder ?? t.createdAt

/** Queue order, exactly as prep lays it out: by track, then unfiled topics
 * before filed ones, buckets alphabetically, then arranged rank (top first).
 * The flat views — the sheet, today, the check-off list — must use this too,
 * or a bucket of newer topics jumps above the ones you put first. */
export function byRank(a: PrepItem, b: PrepItem): number {
  return (
    trackOf(a).localeCompare(trackOf(b)) ||
    Number(!!a.bucket) - Number(!!b.bucket) ||
    (a.bucket ?? '').localeCompare(b.bucket ?? '') ||
    rankOf(b) - rankOf(a)
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
  if (ka === kb) kb -= dir
  void patch(db.prepItems, a.id, { sheetOrder: kb })
  void patch(db.prepItems, b.id, { sheetOrder: ka })
}
