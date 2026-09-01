import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom'
import AppSwitcher from '@personal-os/kit/AppSwitcher'
import TopNav from './components/TopNav'
import Today from './pages/Today'
import Prep from './pages/Prep'
import Sessions from './pages/Sessions'
import SessionDetail from './pages/SessionDetail'
import Practices from './pages/Practices'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import Checkin from './pages/Checkin'
import Journal from './pages/Journal'
import JournalEntry from './pages/JournalEntry'
import OneSheet from './pages/OneSheet'
import { initAutoSync, syncNow } from './sync'
import { syncConfigured } from './settings'

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

// One sync engine per mount. The button itself renders twice — once in the
// wide top bar, once in the narrow header — and only one of the two is ever on
// screen, so the state and the auto-sync subscription live up here rather than
// inside the button, or opening the app would sync twice.
function useSync() {
  const [state, setState] = useState<SyncState>('idle')
  const [error, setError] = useState('')

  const run = useCallback(async (silent = false) => {
    if (!syncConfigured()) {
      if (!silent) setError('set up sync in settings first.')
      return
    }
    setState('syncing')
    setError('')
    try {
      await syncNow()
      setState('ok')
      setTimeout(() => setState('idle'), 2500)
    } catch (e) {
      setState('error')
      if (!silent) setError(e instanceof Error ? e.message.toLowerCase() : 'sync failed')
    }
  }, [])

  useEffect(() => {
    // pull the latest from other devices on app open, then push every local
    // change automatically (debounced) so nothing is lost between devices
    void run(true)
    initAutoSync(() => {
      setState('ok')
      setTimeout(() => setState('idle'), 2000)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, error, run }
}

function SyncButton({ sync }: { sync: ReturnType<typeof useSync> }) {
  const { state, error, run } = sync
  const label =
    state === 'syncing' ? '…' : state === 'ok' ? '✓' : state === 'error' ? '✶' : '↻'
  return (
    <>
      <button
        className="btn-small btn-ghost"
        title="sync now"
        onClick={() => run()}
        disabled={state === 'syncing'}
        aria-label="Sync"
        style={state === 'error' ? { color: 'var(--danger)' } : undefined}
      >
        {label}
      </button>
      {error && <span className="error-text small">{error}</span>}
    </>
  )
}

// The suite. Each app's dot is its own accent — the palette is the wayfinding.
const APPS = [
  { name: 'helm', url: 'https://helm-blush.vercel.app', color: '#7ad6c0' },
  { name: 'anchor', url: 'https://wtnelson1.github.io/Session-Notes/', color: '#e8b64c' },
  { name: 'bounty', url: 'https://wtnelson1.github.io/bounty/', color: '#d08a5a' },
]

const NAV = [
  { to: '/', end: true, glyph: '◉', label: 'today' },
  { to: '/journal', end: false, glyph: '✎', label: 'journal' },
  { to: '/prep', end: false, glyph: '☰', label: 'prep' },
  { to: '/sessions', end: false, glyph: '≣', label: 'sessions' },
  { to: '/insights', end: false, glyph: '✦', label: 'insights' },
]

export default function App() {
  const location = useLocation()
  const isCheckin = location.pathname.startsWith('/checkin')

  // Check-in is a standalone screen with no chrome — and no sync, which is why
  // it returns before <Shell /> rather than hiding the nav inside it.
  if (isCheckin) {
    return (
      <Routes>
        <Route path="/checkin" element={<Checkin />} />
      </Routes>
    )
  }

  return <Shell />
}

function Shell() {
  const sync = useSync()

  // The same two controls sit at the right end of whichever nav is showing.
  const actions = (
    <>
      <SyncButton sync={sync} />
      <Link to="/settings" className="btn btn-small btn-ghost" aria-label="Settings">
        ⚙
      </Link>
    </>
  )

  return (
    <>
      {/* Wide screens get Helm's folder tabs; narrow screens get the header +
          bottom bar. Both are always rendered — index.css shows one. */}
      <TopNav items={NAV} apps={APPS} current="anchor" actions={actions} />

      <div className="app-shell">
        <header className="app-header">
          <h1>
            <AppSwitcher apps={APPS} current="anchor" />
          </h1>
          <div className="header-actions">{actions}</div>
        </header>

        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:id" element={<JournalEntry />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/onesheet" element={<OneSheet />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/practices" element={<Practices />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

        <nav className="bottom-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="icon">{n.glyph}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
