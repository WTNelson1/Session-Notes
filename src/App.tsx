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
import { syncNow } from './sync'
import { syncConfigured } from './settings'

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

function SyncButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [error, setError] = useState('')

  async function run(silent = false) {
    if (!syncConfigured()) {
      if (!silent) setError('Set up sync in Settings first.')
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
      if (!silent) setError(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  useEffect(() => {
    // pull the latest from other devices on app open
    void run(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label =
    state === 'syncing' ? '…' : state === 'ok' ? '✓' : state === 'error' ? '⚠️' : '↻'
  return (
    <>
      <button
        className="btn-small btn-ghost"
        title="Sync now"
        onClick={() => run()}
        disabled={state === 'syncing'}
        aria-label="Sync"
      >
        {label}
      </button>
      {error && <span className="error-text small">{error}</span>}
    </>
  )
}

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
        <h1>Anchor</h1>
        <div className="header-actions">
          <SyncButton />
          <Link to="/settings" className="btn btn-small btn-ghost" aria-label="Settings">
            ⚙︎
          </Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/prep" element={<Prep />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/practices" element={<Practices />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">☀️</span>Today
        </NavLink>
        <NavLink to="/prep" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">📝</span>Prep
        </NavLink>
        <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">🗒️</span>Sessions
        </NavLink>
        <NavLink to="/practices" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">🌱</span>Practices
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">💡</span>Insights
        </NavLink>
      </nav>
    </div>
  )
}
