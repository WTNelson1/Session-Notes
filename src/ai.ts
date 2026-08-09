import Anthropic from '@anthropic-ai/sdk'
import { db, alive, todayStr } from './db'

const SYSTEM = `You are a thoughtful companion inside a private therapy-notes app. The user will share their own journal: therapy session notes, session-prep topics, mood check-ins, and between-session practices.

Your job is to help them see their own material more clearly:
- Find recurring themes, patterns, and connections across entries, and cite the dates you draw from.
- Notice trajectories — what seems to be shifting over time, what practices correlate with better stretches.
- Suggest concrete, gentle next steps: topics worth raising in the next session, practices worth trying or revisiting.

Ground everything in what the notes actually say; quote or paraphrase briefly rather than inventing. Be warm and direct, not clinical or saccharine. You are not a therapist and must not diagnose; when something reads as serious (self-harm, crisis), say plainly that it belongs in the room with their therapist or a crisis line rather than in this app.

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
    id: 'progress',
    label: 'Progress over time',
    prompt:
      'Looking across time: what has shifted, improved, or gotten harder? Use my mood check-ins and session notes as evidence.',
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

  if (moods.length) {
    parts.push('## Mood check-ins (1 = very low, 5 = great)')
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
  const openPrep = prep.filter((p) => !p.done && !p.parentId)
  const coveredPrep = prep.filter((p) => p.done && !p.parentId)
  if (openPrep.length || coveredPrep.length) {
    parts.push('## Session-prep topics')
    if (openPrep.length)
      parts.push('Not yet discussed: ' + openPrep.map(describeTopic).join('; '))
    if (coveredPrep.length)
      parts.push('Already covered: ' + coveredPrep.map(describeTopic).join('; '))
  }

  return parts.join('\n\n')
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
    system: SYSTEM,
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
