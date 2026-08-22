import { useCallback, useEffect, useRef, useState } from 'react'

/* Two ways to stop losing typed work, both built on the same idea: write a
 * little after you stop typing, and write immediately when the page is about
 * to go away. Neither ever calls Claude — AI passes stay on explicit actions.
 *
 *   useAutosave — for text that belongs to a record in the db
 *   useDraft    — for text that has no record yet (a dump, an unfiled insight)
 */

export type AutosaveState = 'idle' | 'saving' | 'saved'

/** hide / unload / unmount — the three ways a half-written note used to vanish */
function useFlushOnExit(flush: () => void) {
  const ref = useRef(flush)
  useEffect(() => {
    ref.current = flush
  })
  useEffect(() => {
    const run = () => ref.current()
    const onHide = () => {
      // a backgrounded tab may never be given another frame — write now
      if (document.hidden) run()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', run)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', run)
      run()
    }
  }, [])
}

export function useAutosave({
  ready,
  signature,
  skip = false,
  save,
  delay = 900,
}: {
  /** false while the record is still loading — nothing is written until true */
  ready: boolean
  /** what the content looks like on disk; a change here schedules a write */
  signature: string
  /** true when there is nothing worth creating a record for yet */
  skip?: boolean
  save: () => Promise<unknown>
  delay?: number
}) {
  const [state, setState] = useState<AutosaveState>('idle')
  /** what is on disk, and what is waiting to get there */
  const lastSaved = useRef<string | null>(null)
  const pending = useRef<string | null>(null)
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    if (!ready || skip || lastSaved.current === signature) return
    pending.current = signature
    const t = setTimeout(async () => {
      setState('saving')
      await saveRef.current()
      lastSaved.current = signature
      pending.current = null
      setState('saved')
    }, delay)
    return () => clearTimeout(t)
  }, [ready, skip, signature, delay])

  // No state updates in here: this runs while the page is going away.
  useFlushOnExit(() => {
    if (!pending.current) return
    const flushed = pending.current
    pending.current = null
    void saveRef.current().then(() => {
      lastSaved.current = flushed
    })
  })

  /** call once an existing record loads: this content is already on disk */
  const markSaved = useCallback((sig: string) => {
    lastSaved.current = sig
  }, [])

  return { state, markSaved }
}

function isBlank(v: unknown) {
  return v === '' || v == null || (Array.isArray(v) && v.length === 0)
}

/** State mirrored into localStorage. Same shape as useState. */
export function useDraft<T>(key: string, initial: T, delay = 300) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      // corrupt or unreadable — fall back rather than blank the screen
      return initial
    }
  })

  const write = useCallback(
    (v: T) => {
      try {
        if (isBlank(v)) localStorage.removeItem(key)
        else localStorage.setItem(key, JSON.stringify(v))
      } catch {
        // private mode or quota — the draft simply does not outlive the page
      }
    },
    [key],
  )

  // Debounced, because this also mirrors text that arrives a token at a time.
  useEffect(() => {
    const t = setTimeout(() => write(value), delay)
    return () => clearTimeout(t)
  }, [value, delay, write])

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  })
  useFlushOnExit(() => write(valueRef.current))

  return [value, setValue] as const
}
