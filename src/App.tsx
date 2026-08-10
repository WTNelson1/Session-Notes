import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom'
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
import { initAutoSync, syncNow } from './sync'
import { syncConfigured } from './settings'

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

function SyncButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [error, setError] = useState('')

  async function run(silent = false) {
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
  }

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

  if (isCheckin) {
    return (
      <Routes>
        <Route path="/checkin" element={<Checkin />} />
      </Routes>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>anchor</h1>
        <div className="header-actions">
          <SyncButton />
          <Link to="/settings" className="btn btn-small btn-ghost" aria-label="Settings">
            ⚙
          </Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/:id" element={<JournalEntry />} />
        <Route path="/prep" element={<Prep />} />
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
  )
}
