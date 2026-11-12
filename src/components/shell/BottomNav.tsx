import { NavLink, useLocation } from 'react-router-dom'
import { IconParties, IconPlus, IconStats } from './icons'

const TABS = [
  { to: '/', label: 'Parties', Icon: IconParties },
  { to: '/nouvelle', label: 'Nouvelle partie', Icon: IconPlus },
  { to: '/stats', label: 'Stats', Icon: IconStats },
]

export function BottomNav({ hidden }: { hidden?: boolean }) {
  const { pathname } = useLocation()
  const active = TABS.findIndex((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)))
  return (
    <nav className={`mate-nav ${hidden ? 'mate-nav--hidden' : ''}`} aria-label="Navigation principale" aria-hidden={hidden || undefined}>
      <div className="mate-nav__surface">
        {active >= 0 && <span className="mate-nav__indicator" style={{ left: `calc(var(--spacing-xs) + ${active} * 100% / 3)` }} />}
        {TABS.map(({ to, label, Icon }, i) => (
          <NavLink key={to} to={to} end={to === '/'} tabIndex={hidden ? -1 : undefined} className={`mate-nav__tab ${i === active ? 'mate-nav__tab--active' : ''}`}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
