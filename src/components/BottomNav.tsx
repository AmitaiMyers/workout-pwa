import { NavLink } from 'react-router';

const ITEMS = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/calendar', label: 'Calendar', icon: '▦' },
  { to: '/history', label: 'History', icon: '↺' },
  { to: '/exercises', label: 'Exercises', icon: '☰' },
  { to: '/templates', label: 'Templates', icon: '⧉' },
] as const;

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
