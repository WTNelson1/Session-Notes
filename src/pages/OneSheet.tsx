import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, patch, stillOpen, todayStr, trackOf, DEFAULT_TRACK, type PrepItem } from '../db'
import { useDraft } from '../autosave'
import { useTracks } from '../tracks'
import { byRank, nudge } from '../order'

// The sheet you hand her at the start of a session, in her reading order:
// last time → new since → carried over → the week in feelings → practices.
// Assembled entirely from local data at render time — no AI, nothing stored,
// nothing to keep up with. Print it (or save as PDF from the print dialog);
// index.css flips it to paper colours under @media print.

const DAY = 86_400_000

function shortStamp(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const SNIPPET = 140
function snippet(text: string): string {
  // notes are outlines — drop the bullet markers and run the lines together
  const t = text
    .split('\n')
    .map((l) => l.replace(/^\s*[-*]\s?/, '').trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s+/g, ' ')
  return t.length > SNIPPET ? t.slice(0, SNIPPET).trimEnd() + '…' : t
}

export default function OneSheet() {
  // Which room this sheet is for. Sticky across visits — you print for the
  // same therapist repeatedly — and switchable from chips at the top.
  const [chosenTrack, setChosenTrack] = useDraft('anchor.sheetTrack', '')
  const { defaultTrack } = useTracks()
  // Other rooms to brief this one on, remembered per main room: the group
  // sheet stays group-only while one therapist's sheet can keep carrying the
  // group material.
  const [alsoMap, setAlsoMap] = useDraft<Record<string, string[]>>('anchor.sheetAlso', {})

  const data = useLiveQuery(async () => {
    const sessions = (await db.sessions.toArray())
      .filter(alive)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    return {
      sessions,
      prep: (await db.prepItems.toArray()).filter(alive),
      practices: (await db.practices.toArray()).filter(alive),
      logs: (await db.practiceLogs.toArray()).filter(alive),
      journalAll: (await db.journal.toArray()).filter(alive),
      roster: (await db.tracks.toArray()).filter(alive),
    }
  })

  if (!data) return <p className="muted">loading…</p>
  const { sessions, prep, practices, journalAll, roster } = data

  const sheetTracks = [
    ...new Set([
      ...roster.map((t) => t.id),
      ...sessions.map(trackOf),
      ...prep.filter((p) => !p.parentId && stillOpen(p)).map(trackOf),
    ]),
  ].sort()
  const track = sheetTracks.includes(chosenTrack)
    ? chosenTrack
    : sheetTracks.includes(defaultTrack)
      ? defaultTrack
      : (sheetTracks[0] ?? DEFAULT_TRACK)

  // "Last time" is the newest saved note IN THIS ROOM. Its createdAt is the
  // boundary: topics that existed before you started writing it were on the
  // table that session; anything newer is this week's material.
  const last = sessions.filter((x) => trackOf(x) === track)[0]
    const boundary = last ? last.createdAt : Date.now() - 7 * DAY
    const boundaryDate = todayStr(new Date(boundary))
    const journal = journalAll.filter((j) => j.at >= boundary).sort((a, b) => a.at - b.at)
    const logs = data.logs.filter((l) => l.date >= boundaryDate)

  const tops = prep.filter((p) => !p.parentId && stillOpen(p) && trackOf(p) === track)

  // Briefing material from the other rooms: what happened there since this
  // room last met, and what is still open there. Read-only — its agenda is
  // ordered on its own sheet.
  const also = (alsoMap[track] ?? []).filter((t) => t !== track && sheetTracks.includes(t))
  const toggleAlso = (t: string) =>
    setAlsoMap({
      ...alsoMap,
      [track]: also.includes(t) ? also.filter((x) => x !== t) : [...also, t].sort(),
    })
  const briefings = also
    .map((t) => ({
      track: t,
      sessions: sessions
        .filter((x) => trackOf(x) === t && x.date >= boundaryDate)
        .sort((a, b) => a.date.localeCompare(b.date)),
      topics: prep
        .filter((p) => !p.parentId && stillOpen(p) && trackOf(p) === t)
        .sort(byRank),
    }))
    .filter((b) => b.sessions.length > 0 || b.topics.length > 0)
  const kidsOf = (id: string) =>
    prep
      .filter((p) => p.parentId === id && !p.done)
      .sort((a, b) => a.createdAt - b.createdAt)
  // With no session note yet there is no "last time" to split against — the
  // whole queue is the agenda. (The 7-day boundary above only scopes journal
  // and practice-log activity, never which topics make the sheet.)
  // The split itself is a guess (created before vs after the last note was
  // started), overridable per topic; an override is scoped to that note's id,
  // so it lapses on its own once a newer session note exists.
  const sectionOf = (t: PrepItem): 'new' | 'carried' => {
    if (!last) return 'new'
    if (t.sheetSection && t.sheetSectionFor === last.id) return t.sheetSection
    return t.createdAt > last.createdAt ? 'new' : 'carried'
  }
  const fresh = tops.filter((t) => sectionOf(t) === 'new').sort(byRank)
  const carried = tops.filter((t) => sectionOf(t) === 'carried').sort(byRank)

  const shift = (t: PrepItem) => {
    if (!last) return
    void patch(db.prepItems, t.id, {
      sheetSection: sectionOf(t) === 'new' ? 'carried' : 'new',
      sheetSectionFor: last.id,
    })
  }


  const tally = new Map<string, number>()
  for (const j of journal) for (const w of j.words) tally.set(w, (tally.get(w) ?? 0) + 1)
  const feelings = [...tally.entries()].sort((a, b) => b[1] - a[1])

  // "Focus" = the homework this session assigned; every active practice if
  // the note predates the practices feature or assigned none.
  const fromLast = last ? practices.filter((p) => p.sourceSessionId === last.id) : []
  const focus = fromLast.length ? fromLast : practices.filter((p) => p.active)
  const doneCount = (pid: string) => logs.filter((l) => l.practiceId === pid).length
  const sinceLabel = last ? 'since last session' : 'this week'

  const empty =
    !last &&
    fresh.length === 0 &&
    carried.length === 0 &&
    briefings.length === 0 &&
    journal.length === 0 &&
    focus.length === 0

  // arrows stop at a bucket boundary: the queue order keeps buckets together,
  // so a swap across one would change nothing on screen
  const sameRun = (a?: PrepItem, b?: PrepItem) => !!a && !!b && (a.bucket ?? '') === (b.bucket ?? '')
  const topicLines = (items: PrepItem[]) =>
    items.map((t, i) => (
      <div key={t.id}>
        <p className="sheet-body">
          · {t.text}
          {t.bucket && <span className="sheet-tag"> ⌗{t.bucket}</span>}
          {items.length > 1 && (
            <span className="no-print">
              <button
                className="btn-small btn-ghost sheet-move"
                onClick={() => nudge(items, i, -1)}
                disabled={!sameRun(t, items[i - 1])}
                aria-label="Move up"
                title="move up"
              >
                ↑
              </button>
              <button
                className="btn-small btn-ghost sheet-move"
                onClick={() => nudge(items, i, 1)}
                disabled={!sameRun(t, items[i + 1])}
                aria-label="Move down"
                title="move down"
              >
                ↓
              </button>
            </span>
          )}
          {last && (
            <button
              className="btn-small btn-ghost sheet-move no-print"
              onClick={() => shift(t)}
              title={
                sectionOf(t) === 'new'
                  ? 'move to "didn\'t get to last time"'
                  : 'move to "new since last session"'
              }
            >
              {sectionOf(t) === 'new' ? '⇣ didn\'t get to' : '⇡ new'}
            </button>
          )}
        </p>
        {kidsOf(t.id).map((c) => (
          <p key={c.id} className="sheet-sub">
            – {c.text}
          </p>
        ))}
      </div>
    ))

  return (
    <div className="card onesheet">
      <div className="row-between">
        <span className="onesheet-title">anchor · session sheet</span>
        <span className="sheet-tag">
          {sheetTracks.length > 1 ? `${[track, ...also].join(' + ')} · ` : ''}
          {todayStr()}
        </span>
      </div>

      {sheetTracks.length > 1 && (
        <div className="row no-print" style={{ gap: 6, marginTop: 8 }}>
          {sheetTracks.map((t) => (
            <button
              key={t}
              className={`btn-small ${t === track ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setChosenTrack(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {sheetTracks.length > 1 && (
        <div className="row no-print" style={{ gap: 6, marginTop: 6 }}>
          <span className="sheet-tag">also brief on:</span>
          {sheetTracks
            .filter((t) => t !== track)
            .map((t) => (
              <button
                key={t}
                role="switch"
                aria-checked={also.includes(t)}
                className={`btn-small ${also.includes(t) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggleAlso(t)}
              >
                {also.includes(t) ? `✓ ${t}` : `＋ ${t}`}
              </button>
            ))}
        </div>
      )}

      {last && (last.summary || last.takeaways.trim() || last.notes.trim()) && (
        <section>
          <p className="sheet-h">last session · {last.date} — for review</p>
          {last.summary ? (
            <p className="sheet-body">✦ {last.summary}</p>
          ) : (
            last.notes.trim() && <p className="sheet-body">{snippet(last.notes)}</p>
          )}
          {last.takeaways.trim() && (
            <p className="sheet-body">
              <em>takeaways:</em> {last.takeaways}
            </p>
          )}
        </section>
      )}

      {fresh.length > 0 && (
        <section>
          <p className="sheet-h">new {sinceLabel}</p>
          {topicLines(fresh)}
        </section>
      )}

      {carried.length > 0 && last && (
        <section>
          <p className="sheet-h">didn't get to last time</p>
          {topicLines(carried)}
        </section>
      )}

      {briefings.map((b) => (
        <section key={b.track}>
          <p className="sheet-h">from {b.track} — for context</p>
          {b.sessions.map((x) => (
            <p key={x.id} className="sheet-body">
              {shortStamp(new Date(x.date + 'T12:00:00').getTime())} ·{' '}
              {x.summary ? `✦ ${x.summary}` : snippet(x.notes) || 'no notes'}
            </p>
          ))}
          {b.topics.length > 0 && (
            <>
              {b.sessions.length > 0 && <p className="sheet-tag sheet-subhead">still open there</p>}
              {b.topics.map((t) => (
                <div key={t.id}>
                  <p className="sheet-body">
                    · {t.text}
                    {t.bucket && <span className="sheet-tag"> ⌗{t.bucket}</span>}
                  </p>
                  {kidsOf(t.id).map((c) => (
                    <p key={c.id} className="sheet-sub">
                      – {c.text}
                    </p>
                  ))}
                </div>
              ))}
            </>
          )}
        </section>
      ))}

      {journal.length > 0 && (
        <section>
          <p className="sheet-h">the week in feelings</p>
          {feelings.length > 0 && (
            <p className="sheet-body">
              {feelings.map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(' · ')}
            </p>
          )}
          {journal.map((j) => (
            <p key={j.id} className="sheet-sub">
              {shortStamp(j.at)}
              {j.words.length > 0 && ` · ${j.words.join(', ')}`}
              {j.text.trim() && ` — ${snippet(j.text)}`}
            </p>
          ))}
        </section>
      )}

      {focus.length > 0 && (
        <section>
          <p className="sheet-h">focus &amp; progress</p>
          {focus.map((p) => (
            <p key={p.id} className="sheet-body">
              🌱 {p.title} — {doneCount(p.id)}× {sinceLabel}
              {p.note.trim() && <span className="sheet-tag"> ({p.note})</span>}
            </p>
          ))}
        </section>
      )}

      {empty && (
        <p className="muted small" style={{ marginTop: 12 }}>
          nothing to bring yet — jot topics in prep and they'll show up here.
        </p>
      )}

      <div className="row no-print" style={{ marginTop: 16 }}>
        <button className="btn-primary btn-small" onClick={() => window.print()}>
          ⎙ print / save as pdf
        </button>
        <span className="muted small">prints on white — choose "save as pdf" in the dialog to share it</span>
      </div>
    </div>
  )
}
