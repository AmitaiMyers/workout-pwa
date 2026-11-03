import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

/** Simple apple outline for the Diet tab (no matching text glyph renders well on phones). */
const appleIcon: ReactNode = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 7c-1.5-1.2-4.5-1.5-6 .8-1.6 2.4-.8 6.6 1.3 9.6 1.2 1.7 2.4 2.6 3.6 2.1.8-.3 1.4-.3 2.2 0 1.2.5 2.4-.4 3.6-2.1 2.1-3 2.9-7.2 1.3-9.6-1.5-2.3-4.5-2-6-.8Z" />
    <path d="M12 7c0-2 1-3.5 3-4" />
  </svg>
);

const ITEMS = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/calendar', label: 'Calendar', icon: '▦' },
  { to: '/history', label: 'History', icon: '↺' },
  { to: '/exercises', label: 'Exercises', icon: '☰' },
  { to: '/diet', label: 'Diet', icon: appleIcon },
] as const satisfies readonly { to: string; label: string; icon: ReactNode }[];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
