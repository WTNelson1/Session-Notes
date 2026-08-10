// The feelings wheel — three rings: core family → nuance → precise word.
// Taxonomy follows the widely-used therapy emotion wheel (Roberts variant).
// If your therapist's wheel differs, edit the lists here — the UI adapts.

export interface MiddleFeeling {
  name: string
  children: string[]
}

export interface CoreFamily {
  name: string
  color: string
  children: MiddleFeeling[]
}

export const WHEEL: CoreFamily[] = [
  {
    name: 'happy',
    color: '#4cc38a',
    children: [
      { name: 'playful', children: ['aroused', 'cheeky'] },
      { name: 'content', children: ['free', 'joyful'] },
      { name: 'interested', children: ['curious', 'inquisitive'] },
      { name: 'proud', children: ['successful', 'confident'] },
      { name: 'accepted', children: ['respected', 'valued'] },
      { name: 'powerful', children: ['courageous', 'creative'] },
      { name: 'peaceful', children: ['loving', 'thankful'] },
      { name: 'trusting', children: ['sensitive', 'intimate'] },
      { name: 'optimistic', children: ['hopeful', 'inspired'] },
    ],
  },
  {
    name: 'surprised',
    color: '#08b0d5',
    children: [
      { name: 'startled', children: ['shocked', 'dismayed'] },
      { name: 'confused', children: ['disillusioned', 'perplexed'] },
      { name: 'amazed', children: ['astonished', 'in awe'] },
      { name: 'excited', children: ['eager', 'energetic'] },
    ],
  },
  {
    name: 'bad',
    color: '#94a3b8',
    children: [
      { name: 'bored', children: ['indifferent', 'apathetic'] },
      { name: 'busy', children: ['pressured', 'rushed'] },
      { name: 'stressed', children: ['overwhelmed', 'out of control'] },
      { name: 'tired', children: ['sleepy', 'unfocused'] },
    ],
  },
  {
    name: 'fearful',
    color: '#b094f0',
    children: [
      { name: 'scared', children: ['helpless', 'frightened'] },
      { name: 'anxious', children: ['overwhelmed', 'worried'] },
      { name: 'insecure', children: ['inadequate', 'inferior'] },
      { name: 'weak', children: ['worthless', 'insignificant'] },
      { name: 'rejected', children: ['excluded', 'persecuted'] },
      { name: 'threatened', children: ['nervous', 'exposed'] },
    ],
  },
  {
    name: 'angry',
    color: '#e8825a',
    children: [
      { name: 'let down', children: ['betrayed', 'resentful'] },
      { name: 'humiliated', children: ['disrespected', 'ridiculed'] },
      { name: 'bitter', children: ['indignant', 'violated'] },
      { name: 'mad', children: ['furious', 'jealous'] },
      { name: 'aggressive', children: ['provoked', 'hostile'] },
      { name: 'frustrated', children: ['infuriated', 'annoyed'] },
      { name: 'distant', children: ['withdrawn', 'numb'] },
      { name: 'critical', children: ['skeptical', 'dismissive'] },
    ],
  },
  {
    name: 'disgusted',
    color: '#97c05c',
    children: [
      { name: 'disapproving', children: ['judgmental', 'embarrassed'] },
      { name: 'disappointed', children: ['appalled', 'revolted'] },
      { name: 'awful', children: ['nauseated', 'detestable'] },
      { name: 'repelled', children: ['horrified', 'hesitant'] },
    ],
  },
  {
    name: 'sad',
    color: '#5b8def',
    children: [
      { name: 'lonely', children: ['isolated', 'abandoned'] },
      { name: 'vulnerable', children: ['victimized', 'fragile'] },
      { name: 'despair', children: ['grief', 'powerless'] },
      { name: 'guilty', children: ['ashamed', 'remorseful'] },
      { name: 'depressed', children: ['empty', 'inferior'] },
      { name: 'hurt', children: ['disappointed', 'embarrassed'] },
    ],
  },
]

/** word → family color (first family wins for the few duplicated words) */
export const WORD_COLOR = new Map<string, string>()
for (const core of WHEEL) {
  if (!WORD_COLOR.has(core.name)) WORD_COLOR.set(core.name, core.color)
  for (const mid of core.children) {
    if (!WORD_COLOR.has(mid.name)) WORD_COLOR.set(mid.name, core.color)
    for (const w of mid.children) {
      if (!WORD_COLOR.has(w)) WORD_COLOR.set(w, core.color)
    }
  }
}
