import Anthropic from '@anthropic-ai/sdk'
import { db, alive, stillOpen, todayStr } from './db'
import { getSetting } from './settings'

/** optional user-provided context (pronouns, names, anything) for every AI call */
function aboutBlock(): string {
  const about = getSetting('aboutMe').trim()
  return about ? `\n\nAbout the author, in their own words: ${about}` : ''
}

const SYSTEM = `You are a thoughtful companion inside a private therapy-notes app. The user will share their own journal: therapy session notes, session-prep topics, feelings check-ins from an emotion wheel (they are practicing naming feelings precisely — acknowledge and reinforce that skill), journal entries, and between-session practices.

Your job is to help them see their own material more clearly:
- Find recurring themes, patterns, and connections across entries, and cite the dates you draw from.
- Notice trajectories — what seems to be shifting over time, what practices correlate with better stretches.
- Suggest concrete, gentle next steps: topics worth raising in the next session, practices worth trying or revisiting.

Ground everything in what the notes actually say; quote or paraphrase briefly rather than inventing. Be warm and direct, not clinical or saccharine. You are not a therapist and must not diagnose; when something reads as serious (self-harm, crisis), say plainly that it belongs in the room with their therapist or a crisis line rather than in this app.

Address the author directly as "you" — never refer to them in the third person, and never guess at their pronouns or gender.

Format with short markdown headings and tight paragraphs. Lead with the most useful observation.`

export interface InsightPreset {
  id: string
  label: string
  prompt: string
}

export const PRESETS: InsightPreset[] = [
  {
    id: 'themes',
    label: 'Recurring themes',
    prompt:
      'What themes and patterns recur across my notes? Group them, cite the dates they show up, and note anything I might not have connected myself.',
  },
  {
    id: 'feelings',
    label: 'Feelings patterns',
    prompt:
      'Look at the feelings I selected from the wheel across my check-ins. Which families dominate? Which feelings co-occur? What situations (from journal text and session notes) seem to trigger which feelings? Where does my feelings vocabulary seem narrow or avoided?',
  },
  {
    id: 'progress',
    label: 'Progress over time',
    prompt:
      'Looking across time: what has shifted, improved, or gotten harder? Use my feelings check-ins, journal entries, and session notes as evidence.',
  },
  {
    id: 'next-session',
    label: 'Topics for next session',
    prompt:
      'Based on recent notes, moods, and unresolved threads, suggest 3-5 topics worth bringing to my next therapy session, each with a one-line reason.',
  },
  {
    id: 'practices',
    label: 'Practice review',
    prompt:
      'Review my practices and their completion logs. Which seem to be helping (based on mood and session notes)? What would you adjust, drop, or add?',
  },
]

/** Assemble the user's data into a compact plain-text journal for the model. */
export async function buildContext(sinceDays: number | null): Promise<string> {
  const cutoff = sinceDays ? Date.now() - sinceDays * 86_400_000 : 0
  const cutoffDate = sinceDays ? todayStr(new Date(cutoff)) : ''

  const sessions = (await db.sessions.toArray())
    .filter(alive)
    .filter((s) => s.date >= cutoffDate)
    .sort((a, b) => a.date.localeCompare(b.date))
  const moods = (await db.moods.toArray())
    .filter(alive)
    .filter((m) => m.at >= cutoff)
    .sort((a, b) => a.at - b.at)
  const journal = (await db.journal.toArray())
    .filter(alive)
    .filter((j) => j.at >= cutoff)
    .sort((a, b) => a.at - b.at)
  const practices = (await db.practices.toArray()).filter(alive)
  const logs = (await db.practiceLogs.toArray())
    .filter(alive)
    .filter((l) => l.date >= cutoffDate)
  const prep = (await db.prepItems.toArray()).filter(alive)

  const parts: string[] = []

  if (sessions.length) {
    parts.push('## Therapy session notes')
    for (const s of sessions) {
      parts.push(`### Session ${s.date}\n${s.notes.trim()}`)
      if (s.takeaways.trim()) parts.push(`Takeaways: ${s.takeaways.trim()}`)
    }
  }

  if (journal.length) {
    parts.push('## Feelings check-ins & journal entries (feelings named from an emotion wheel)')
    for (const j of journal) {
      const d = new Date(j.at)
      const stamp = `${todayStr(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const words = j.words.length ? `feelings: ${j.words.join(', ')}` : ''
      const text = j.text.trim()
      parts.push(`### ${stamp}${words ? `\n${words}` : ''}${text ? `\n${text}` : ''}`)
    }
  }

  if (moods.length) {
    parts.push('## Older mood check-ins (legacy 1-5 scale, 1 = very low)')
    for (const m of moods) {
      const d = new Date(m.at)
      const stamp = `${todayStr(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      parts.push(`- ${stamp}: ${m.score}/5${m.note ? ` — ${m.note}` : ''}`)
    }
  }

  if (practices.length) {
    parts.push('## Practices (homework between sessions)')
    for (const p of practices) {
      const count = logs.filter((l) => l.practiceId === p.id).length
      const status = p.active ? 'active' : 'archived'
      parts.push(
        `- "${p.title}" (${status}): completed ${count}x in this period${p.note ? `. Note: ${p.note}` : ''}`,
      )
    }
  }

  const describeTopic = (p: (typeof prep)[number]) => {
    const subs = prep.filter((c) => c.parentId === p.id)
    return subs.length
      ? `"${p.text}" (details: ${subs.map((c) => `"${c.text}"`).join('; ')})`
      : `"${p.text}"`
  }
  const openPrep = prep.filter((p) => !p.parentId && stillOpen(p))
  const coveredPrep = prep.filter((p) => p.done && !p.parentId)
  // Deliberately kept, and kept separate: what someone writes down and then
  // releases without ever raising it is a pattern worth seeing, but calling it
  // "not yet discussed" would be the opposite of what happened.
  const letGoPrep = prep.filter((p) => !p.done && p.letGoAt && !p.parentId)
  if (openPrep.length || coveredPrep.length || letGoPrep.length) {
    parts.push('## Session-prep topics')
    if (openPrep.length)
      parts.push('Not yet discussed: ' + openPrep.map(describeTopic).join('; '))
    if (coveredPrep.length)
      parts.push('Already covered: ' + coveredPrep.map(describeTopic).join('; '))
    if (letGoPrep.length)
      parts.push(
        'Written down but let go, never discussed (the moment passed): ' +
          letGoPrep.map(describeTopic).join('; '),
      )
  }

  return parts.join('\n\n')
}

/** cheap stable hash so we only re-summarize when the note text changed */
export function textHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return String(h)
}

/** Distill a session note into a 1-2 sentence scannable preview. */
export async function summarizeSession(
  apiKey: string,
  notes: string,
  takeaways: string,
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const resp = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 300,
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
    system:
      'You write one-line previews of therapy session notes, so the author can recognize a session at a glance in a list. Capture the main focus and the single biggest point or shift. 1-2 sentences, at most ~35 words, plain prose, lowercase, no preamble, no quotes around the output. Refer to the author as "you" (e.g. "explored your pattern of…") — never in the third person, and never guess at pronouns or gender.' +
      aboutBlock(),
    messages: [
      {
        role: 'user',
        content: `Summarize this session note:\n\n<note>\n${notes}${takeaways.trim() ? `\n\nTakeaways: ${takeaways}` : ''}\n</note>`,
      },
    ],
  })
  if (resp.stop_reason === 'refusal') throw new Error('summary declined')
  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

/** notes shorter than this get no auto-review — thin material invites invention */
export const REVIEW_MIN_CHARS = 280

const REVIEW_SYSTEM = `You review a single therapy session note for its author. Produce exactly these markdown sections:

## core themes
2-3 themes, one line each.

## key moments
Insights or reframes, kept in the author's own language — quote or closely paraphrase the note.

## action items
Anything the author committed to or their therapist assigned. Only what the note actually records.

## continuity
Recurring patterns, progress on earlier threads, and contradictions — when the note contradicts what the author has said they want, point it out plainly. You may reference ONLY the earlier sessions provided in <earlier_sessions>; if none are provided or none are relevant, write "nothing to connect yet."

## open questions
Unresolved topics worth revisiting.

Grounding rules — these override everything else:
- Work only from what is written. Never invent moments, quotes, commitments, or details that are not in the notes.
- Scale to the material: a thin note gets a thin review — one line per section, or "nothing in the notes for this."
- Use the author's framing and their therapist's — no clinical labels neither of them used. Don't diagnose or prescribe.
- Lowercase, direct, no preamble, no closing remarks.`

/** Generate the five-section review for one session, grounded in its note
 * plus up to three earlier sessions (for continuity only). */
export async function reviewSession(
  apiKey: string,
  session: { date: string; notes: string; takeaways: string },
  history: { date: string; notes: string; takeaways: string }[],
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const earlier = history
    .map(
      (h) =>
        `<session date="${h.date}">\n${h.notes}${h.takeaways.trim() ? `\nTakeaways: ${h.takeaways}` : ''}\n</session>`,
    )
    .join('\n')
  const resp = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1500,
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
    system: REVIEW_SYSTEM + aboutBlock(),
    messages: [
      {
        role: 'user',
        content: `Review this session:\n\n<session date="${session.date}">\n${session.notes}${session.takeaways.trim() ? `\n\nTakeaways: ${session.takeaways}` : ''}\n</session>\n\n<earlier_sessions>\n${earlier || '(none)'}\n</earlier_sessions>`,
      },
    ],
  })
  if (resp.stop_reason === 'refusal') throw new Error('review declined')
  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

/**
 * Stream an insight from Claude. Calls onDelta with each text chunk;
 * resolves with the full text.
 */
export async function runInsight(
  apiKey: string,
  question: string,
  context: string,
  onDelta: (text: string) => void,
): Promise<string> {
  if (!context.trim()) {
    throw new Error('There are no notes in this time range yet — add some entries first.')
  }
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const stream = client.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 8000,
    // Opus 5's safety classifiers can occasionally decline benign requests;
    // the server-side fallback re-runs those on Opus 4.8 in the same call.
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
    system: SYSTEM + aboutBlock(),
    messages: [
      {
        role: 'user',
        content: `${question}\n\nHere is my journal:\n\n<journal>\n${context}\n</journal>`,
      },
    ],
  })

  stream.on('text', onDelta)
  const final = await stream.finalMessage()

  if (final.stop_reason === 'refusal') {
    throw new Error('The model declined this request. Try rephrasing your question.')
  }
  return final.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/* ---------- brain dump → prep topics ---------- */

export interface DumpTopic {
  /** the topic line, as it will read in the prep queue */
  text: string
  /** one of the author's existing buckets, or '' for the inbox */
  bucket: string
  /** the specifics that belong under it, as sub-items */
  details: string[]
}

const DUMP_SYSTEM = `You turn a brain dump into session-prep topics for a private therapy app.

The author writes messily and out of order — half sentences, tangents, several things tangled in one paragraph. Your job is to separate the threads and tighten each one into a line they will recognize at a glance. You are sorting their words, not interpreting them.

Rules:
- One topic per distinct thing worth raising. Split what is tangled together; never merge two unrelated threads to make a tidier list.
- Keep the author's own words and framing. Fix grammar and cut filler, but do not translate what they wrote into clinical or therapeutic language, and do not add insight, diagnosis, or advice they did not write themselves.
- Topic lines: lowercase, plain, at most about ten words, no trailing period.
- details: the specifics from the dump that sit under that topic, each one short and lowercase. Leave the array empty when the dump has no specifics — never invent detail to fill it.
- Not everything is a topic. Venting with no ask, or a passing mood, can be dropped. Prefer fewer true topics over covering every sentence.
- If you must refer to the author, say "you" — never guess their pronouns or gender.
- bucket: use one of the author's existing buckets only when it clearly fits, spelled exactly as given; otherwise use an empty string. Never invent a bucket name.

Return your answer only by calling the topics tool.`

const TOPICS_TOOL: Anthropic.Beta.BetaTool = {
  name: 'topics',
  description: 'Return the session-prep topics found in the brain dump.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      topics: {
        type: 'array',
        description: 'One entry per topic, in the order they came up in the dump.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'the topic line, lowercase, ~10 words max' },
            bucket: {
              type: 'string',
              description: 'an existing bucket name, or an empty string for none',
            },
            details: {
              type: 'array',
              description: 'short specifics under this topic; empty array if none',
              items: { type: 'string' },
            },
          },
          required: ['text', 'bucket', 'details'],
          additionalProperties: false,
        },
      },
    },
    required: ['topics'],
    additionalProperties: false,
  },
}

const MAX_TOPICS = 20
const MAX_DETAILS = 8

/** Trust nothing that comes back: shape it, trim it, cap it, drop the junk. */
export function normalizeTopics(raw: unknown, buckets: string[]): DumpTopic[] {
  const list = (raw as { topics?: unknown } | null)?.topics
  if (!Array.isArray(list)) return []
  const clean = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
  const known = new Set(buckets)
  const seen = new Set<string>()
  const out: DumpTopic[] = []
  for (const item of list) {
    const t = item as { text?: unknown; bucket?: unknown; details?: unknown }
    const text = clean(t?.text, 200)
    if (!text || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    const bucket = clean(t?.bucket, 40).toLowerCase()
    const details = Array.isArray(t?.details)
      ? (t.details as unknown[]).map((d) => clean(d, 300)).filter(Boolean).slice(0, MAX_DETAILS)
      : []
    // an invented bucket name lands in the inbox rather than starting a new pile
    out.push({ text, bucket: known.has(bucket) ? bucket : '', details })
    if (out.length >= MAX_TOPICS) break
  }
  return out
}

/** Parse a brain dump into reviewable prep topics. Nothing is saved here. */
export async function bulletsFromDump(
  apiKey: string,
  dump: string,
  buckets: string[],
): Promise<DumpTopic[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const resp = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    betas: ['server-side-fallback-2026-06-01'],
    fallbacks: [{ model: 'claude-opus-4-8' }],
    system: DUMP_SYSTEM + aboutBlock(),
    tools: [TOPICS_TOOL],
    tool_choice: { type: 'tool', name: 'topics' },
    messages: [
      {
        role: 'user',
        content: `My existing buckets: ${buckets.length ? buckets.join(', ') : '(none yet)'}\n\nHere is the dump:\n\n<dump>\n${dump}\n</dump>`,
      },
    ],
  })
  if (resp.stop_reason === 'refusal') {
    throw new Error('the model declined this one — you can still add topics by hand')
  }
  for (const block of resp.content) {
    if (block.type === 'tool_use') return normalizeTopics(block.input, buckets)
  }
  throw new Error('nothing came back — try again')
}
