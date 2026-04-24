'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '@/lib/stores/authStore';
import useSocketStore from '@/lib/stores/socketStore';
import useUIStore from '@/lib/stores/uiStore';

const BREADCRUMB_MAP = {
  '/admin/dashboard':  ['Admin', 'Dashboard'],
  '/admin/incidents':  ['Admin', 'Incidents'],
  '/admin/analytics':  ['Admin', 'Analytics'],
  '/admin/map':        ['Admin', 'Venue Map'],
  '/admin/settings':   ['Admin', 'Settings'],
  '/staff/dashboard':  ['Staff', 'Dashboard'],
  '/staff/incidents':  ['Staff', 'Incidents'],
  '/qr':               ['QR Codes'],
};

function getBreadcrumb(pathname) {
  for (const [path, crumbs] of Object.entries(BREADCRUMB_MAP)) {
    if (pathname === path || pathname.startsWith(path + '/')) return crumbs;
  }
  return [];
}

export default function TopBar() {
  const user       = useAuthStore(s => s.user);
  const logout     = useAuthStore(s => s.logout);
  const connected  = useSocketStore(s => s.connected);
  const isReconnecting = useSocketStore(s => s.isReconnecting);
  const soundOn    = useUIStore(s => s.soundEnabled);
  const toggleSound = useUIStore(s => s.toggleSound);
  const pathname   = usePathname();
  const router = useRouter();
  const [showUser, setShowUser] = useState(false);

  const crumbs = getBreadcrumb(pathname);
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';

  const connStyle =
    connected
      ? { dot: '#2DC653', shadow: '#2DC653', label: 'ONLINE', bg: 'rgba(45,198,83,0.12)', border: 'rgba(45,198,83,0.30)' }
      : isReconnecting
      ? { dot: '#F4A261', shadow: '#F4A261', label: 'RECONNECTING', bg: 'rgba(244,162,97,0.12)', border: 'rgba(244,162,97,0.30)', animate: true }
      : { dot: '#E63946', shadow: '#E63946', label: 'OFFLINE', bg: 'rgba(230,57,70,0.12)', border: 'rgba(230,57,70,0.30)' };

  return (
    <header
      className="topbar flex items-center px-5 gap-4"
      style={{ position: 'sticky', top: 0, zIndex: 40 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: 'rgba(232,234,240,0.22)', fontSize: 11 }}>/</span>}
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.06em',
                color: i === crumbs.length - 1 ? 'rgba(232,234,240,0.65)' : 'rgba(232,234,240,0.28)',
              }}
            >
              {c.toUpperCase()}
            </span>
          </span>
        ))}
      </div>

      {/* Center — venue name */}
      <div className="hidden md:flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full animate-ping-slow"
          style={{ background: '#2DC653', boxShadow: '0 0 5px #2DC653' }}
        />
        <span className="mono" style={{ fontSize: 12, color: 'rgba(232,234,240,0.45)', letterSpacing: '0.05em' }}>
          GRAND HOTEL &amp; RESORT
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Connectivity badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full mono"
          style={{ fontSize: 10, background: connStyle.bg, border: `0.5px solid ${connStyle.border}`, letterSpacing: '0.06em', color: connStyle.dot }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connStyle.animate ? 'animate-ping-slow' : ''}`} style={{ background: connStyle.dot, boxShadow: `0 0 4px ${connStyle.shadow}` }} />
          {connStyle.label}
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
          style={{ fontSize: 14, color: soundOn ? 'rgba(232,234,240,0.55)' : 'rgba(232,234,240,0.22)' }}
          title={soundOn ? 'Mute alerts' : 'Unmute alerts'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.10)' }} />

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUser(v => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-white/5"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold mono"
              style={{ background: 'rgba(230,57,70,0.20)', color: '#E63946', fontSize: 11, border: '0.5px solid rgba(230,57,70,0.40)' }}
            >
              {initials}
            </div>
            {user && (
              <span className="hidden sm:block" style={{ fontSize: 13, color: 'rgba(232,234,240,0.65)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showUser && (
            <div
              className="absolute right-0 top-full mt-2 rounded-xl p-3 space-y-2 z-50 animate-slide-up"
              style={{ width: 200, background: 'rgba(8,11,22,0.97)', border: '0.5px solid rgba(255,255,255,0.13)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
            >
              <div style={{ padding: '6px 8px' }}>
                <p className="font-semibold" style={{ fontSize: 14, color: 'rgba(232,234,240,0.90)' }}>{user?.name}</p>
                <p className="mono capitalize mt-0.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.38)', letterSpacing: '0.06em' }}>{user?.role}</p>
              </div>
              <div style={{ height: 0.5, background: 'rgba(255,255,255,0.08)' }} />
              <button
                onClick={() => { setShowUser(false); logout(); router.push('/login'); }}
                className="w-full text-left px-2 py-2 rounded-lg transition-all hover:bg-red-500/10"
                style={{ fontSize: 13, color: 'rgba(232,234,240,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                → Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
