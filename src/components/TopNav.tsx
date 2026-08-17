import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import AppSwitcher from '@personal-os/kit/AppSwitcher'
import type { AppLink } from '@personal-os/kit/AppSwitcher'

// The wide-screen chrome, borrowed wholesale from Helm: a sticky bar carrying
// the wordmark, a row of folder tabs, and the header actions pushed right.
// CSS decides which nav is on screen — below the breakpoint this whole bar is
// display:none and the bottom bar takes over (see .top-nav in index.css).

export interface TopNavItem {
  to: string
  end: boolean
  label: string
}

// Folder-tab silhouette: open at the bottom, long sweeping shoulders to a low
// flat top. Drawn into a squashed viewBox so the shoulders stay soft at any
// tab width.
const TAB_PATH = 'M0,48 C30,48 28,18 48,18 L112,18 C132,18 130,48 160,48'
const TAB_FILL = `${TAB_PATH} L0,48 Z`

function Tab({ item, z }: { item: TopNavItem; z: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}
      // The active tab has to sit above its neighbours or their fills clip its
      // shoulders; the rest stack right-to-left so each overlaps the next.
      style={({ isActive }) => ({ zIndex: isActive ? 30 : z })}
    >
      {({ isActive }) => (
        <>
          <svg viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true">
            <path d={TAB_FILL} fill={isActive ? 'var(--bg-elev-2)' : 'var(--bg)'} />
            <path
              d={TAB_PATH}
              fill="none"
              stroke={isActive ? 'var(--accent)' : 'var(--line-soft)'}
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function TopNav({
  items,
  apps,
  current,
  actions,
}: {
  items: TopNavItem[]
  apps: AppLink[]
  current: string
  actions: ReactNode
}) {
  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        {/* The wordmark is the app-switcher trigger, exactly as in the narrow
            header — it inherits its type from this block. */}
        <div className="top-nav-brand">
          <AppSwitcher apps={apps} current={current} />
        </div>
        <div className="top-nav-tabs">
          {items.map((item, i) => (
            <Tab key={item.to} item={item} z={items.length - i} />
          ))}
        </div>
        <div className="header-actions top-nav-actions">{actions}</div>
      </div>
    </nav>
  )
}
