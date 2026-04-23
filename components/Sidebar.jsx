'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/authStore';
import useSocketStore from '@/lib/stores/socketStore';
import useUIStore from '@/lib/stores/uiStore';
import useIncidentStore from '@/lib/stores/incidentStore';

/* ── Shield SVG ─────────────────────────────────────── */
function ShieldIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 27" fill="none">
      <path d="M12 1L2 5V13C2 19.1 6.5 24.7 12 26.5C17.5 24.7 22 19.1 22 13V5L12 1Z"
        fill="rgba(230,57,70,0.20)" stroke="#E63946" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M9 13.5L11 15.5L15 10.5" stroke="#E63946" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Nav configs ─────────────────────────────────────── */
const NAV_ADMIN = [
  { href: '/admin/dashboard', icon: '◼',  emoji: '📊', label: 'Dashboard' },
  { href: '/admin/incidents', icon: '!',  emoji: '🚨', label: 'Incidents' },
  { href: '/admin/map',       icon: '⬡',  emoji: '🗺️',  label: 'Venue Map' },
  { href: '/admin/analytics', icon: '▲',  emoji: '📈', label: 'Analytics' },
  { href: '/admin/settings',  icon: '⚙',  emoji: '⚙️',  label: 'Settings' },
  { href: '/qr',              icon: '#',  emoji: '📱', label: 'QR Codes' },
];
const NAV_STAFF = [
  { href: '/staff/dashboard', icon: '◼', emoji: '📊', label: 'Dashboard' },
  { href: '/staff/incidents', icon: '!', emoji: '🚨', label: 'Incidents' },
  { href: '/staff/drill', icon: '*', emoji: '🧪', label: 'Drill' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user       = useAuthStore(s => s.user);
  const logout     = useAuthStore(s => s.logout);
  const connected  = useSocketStore(s => s.connected);
  const drillMode  = useUIStore(s => s.drillMode);
  const isDark     = useUIStore(s => s.isDarkMode);
  const toggleDark = useUIStore(s => s.toggleDark);
  const pathname   = usePathname();
  const router = useRouter();
  const incidents  = useIncidentStore(s => s.incidents);

  const activeCount = incidents.filter(i => i.status !== 'resolved').length;
  const nav = user?.role === 'admin' ? NAV_ADMIN : NAV_STAFF;
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const sidebarW = collapsed ? 56 : 220;

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 overflow-hidden flex-shrink-0"
      style={{
        width: sidebarW,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(5,7,15,0.95)',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center px-3 border-b"
        style={{ height: 56, borderColor: 'rgba(255,255,255,0.07)', gap: collapsed ? 0 : 10 }}
      >
        <div className="flex-shrink-0 flex items-center justify-center">
          <ShieldIcon size={28} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="font-bold" style={{ fontSize: 15, letterSpacing: '-0.01em', color: 'white' }}>
              Crisis<span style={{ color: '#E63946' }}>Link</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/5"
          style={{ color: 'rgba(232,234,240,0.30)', fontSize: 11 }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Active incident count badge */}
      {!collapsed && activeCount > 0 && (
        <div
          className="mx-3 mt-3 px-3 py-2 rounded-xl flex items-center justify-between"
          style={{ background: 'rgba(230,57,70,0.12)', border: '0.5px solid rgba(230,57,70,0.28)' }}
        >
          <span className="mono" style={{ fontSize: 9, color: 'rgba(230,57,70,0.80)', letterSpacing: '0.08em' }}>
            ACTIVE INCIDENTS
          </span>
          <span className="font-black count-flip" style={{ fontSize: 22, color: '#E63946', lineHeight: 1 }}>
            {activeCount}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center rounded-lg transition-all relative group"
              style={{
                height: 44,
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '0 16px' : '0 12px',
                background: active ? 'rgba(230,57,70,0.10)' : 'transparent',
                color: active ? 'white' : 'rgba(232,234,240,0.48)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              {/* Active left bar */}
              {active && (
                <div className="absolute left-0 top-[18%] bottom-[18%] w-0.5 rounded-r"
                  style={{ background: '#E63946', boxShadow: '0 0 8px rgba(230,57,70,0.7)' }} />
              )}
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
              {!collapsed && (
                <span className="font-medium" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div
                  className="absolute left-14 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap"
                  style={{ background: 'rgba(8,11,22,0.95)', border: '0.5px solid rgba(255,255,255,0.14)', fontSize: 13, color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: 8, paddingBottom: 12, space: 4 }}>
        {/* Connectivity */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: connected ? '#2DC653' : '#E63946', boxShadow: connected ? '0 0 6px #2DC653' : '0 0 6px #E63946' }}
          />
          {!collapsed && (
            <span className="mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.06em' }}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          )}
        </div>

        {/* Drill mode indicator */}
        {drillMode && !collapsed && (
          <div className="mx-3 my-1 px-2 py-1 rounded-lg text-center"
            style={{ background: 'rgba(244,162,97,0.18)', border: '0.5px solid rgba(244,162,97,0.38)' }}>
            <span className="mono font-bold" style={{ fontSize: 9, color: '#F4A261', letterSpacing: '0.1em' }}>
              ⚡ DRILL MODE
            </span>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center w-full rounded-lg transition-all hover:bg-white/5"
          style={{ height: 38, gap: 10, padding: collapsed ? '0 16px' : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start', color: 'rgba(232,234,240,0.40)' }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>{isDark ? '🌙' : '☀️'}</span>
          {!collapsed && <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>

        {/* User */}
        {user && (
          <div
            className="flex items-center rounded-lg mt-1"
            style={{ height: 44, gap: 10, padding: collapsed ? '0 12px' : '0 8px', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <div
              className="flex items-center justify-center font-bold flex-shrink-0 rounded-full"
              style={{ width: 32, height: 32, background: 'rgba(230,57,70,0.20)', color: '#E63946', fontSize: 12, border: '0.5px solid rgba(230,57,70,0.40)' }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ fontSize: 13, color: 'rgba(232,234,240,0.85)' }}>{user.name}</p>
                <p className="mono capitalize" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.06em' }}>{user.role}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="text-xs transition-colors hover:text-red-400"
                style={{ color: 'rgba(232,234,240,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
              >
                →
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
