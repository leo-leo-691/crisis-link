'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import useAuthStore from '@/lib/stores/authStore';

export default function HomePage() {
  return (
    <AppProviders>
      <HomeContent />
    </AppProviders>
  );
}

/* ── Demo Accounts ───────────────────────────────────── */
const DEMO_ACCOUNTS = [
  { email: 'admin@grandhotel.com',  password: 'demo1234', role: 'Admin',    color: 'rgba(230,57,70,0.20)',   border: 'rgba(230,57,70,0.40)',   textColor: '#FF6B6B' },
  { email: 'manager@grandhotel.com',password: 'demo1234', role: 'Manager',  color: 'rgba(244,162,97,0.18)',  border: 'rgba(244,162,97,0.38)',  textColor: '#F4A261' },
  { email: 'staff@grandhotel.com',  password: 'demo1234', role: 'Staff',    color: 'rgba(69,123,157,0.20)',  border: 'rgba(69,123,157,0.40)',  textColor: '#7DBFEF' },
];

const RECENT_ACTIVITY = [
  { icon: '🔥', color: 'rgba(230,57,70,0.25)', border: 'rgba(230,57,70,0.50)', text: 'Fire alert in Kitchen — Zone 4', time: '2m ago' },
  { icon: '🚑', color: 'rgba(69,123,157,0.25)', border: 'rgba(69,123,157,0.50)', text: 'Medical response at Pool Area', time: '8m ago' },
  { icon: '🔐', color: 'rgba(244,162,97,0.25)', border: 'rgba(244,162,97,0.50)', text: 'Security breach — Parking Level 2', time: '22m ago' },
];

/* ── Shield SVG Logo ─────────────────────────────────── */
function ShieldIcon({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 2L4 11V30C4 42.5 14 53.5 26 58C38 53.5 48 42.5 48 30V11L26 2Z"
        fill="rgba(230,57,70,0.18)" stroke="#E63946" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M26 2L4 11V30C4 42.5 14 53.5 26 58C38 53.5 48 42.5 48 30V11L26 2Z"
        fill="url(#shield-gradient)" opacity="0.6"/>
      <path d="M22 28L25 31L31 22" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 15V35M18 24H34" stroke="rgba(230,57,70,0.45)" strokeWidth="1" strokeLinecap="round"/>
      <defs>
        <linearGradient id="shield-gradient" x1="4" y1="2" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E63946" stopOpacity="0.3"/>
          <stop offset="1" stopColor="#E63946" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function HomeContent() {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const router  = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.replace('/admin/dashboard');
      else router.replace('/staff/dashboard');
    }
  }, [user, loading]);

  return (
    <main
      className="min-h-screen flex items-stretch relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(230,57,70,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(69,123,157,0.06) 0%, transparent 50%), #05070F',
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(230,57,70,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(69,123,157,0.06) 0%, transparent 50%),
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, auto, 60px 60px, 60px 60px',
        backgroundColor: '#05070F',
      }}
    >
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-center px-12 w-80 xl:w-96 animate-fade-in delay-200">
        <div className="glass p-6 space-y-5">
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: '#E63946' }}>SYSTEM STATUS</p>
          <div className="space-y-3">
            {[
              { label: 'Emergency Network',  status: 'OPERATIONAL' },
              { label: 'AI Triage Engine',   status: 'OPERATIONAL' },
              { label: 'Alert Broadcasting', status: 'OPERATIONAL' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(232,234,240,0.65)' }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping-slow" style={{ boxShadow: '0 0 6px #2DC653' }} />
                  <span className="mono text-[10px] tracking-wide" style={{ color: '#2DC653' }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div>
            <p className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(232,234,240,0.35)' }}>Active Incidents Today</p>
            <p className="font-bold count-flip" style={{ fontSize: 48, color: 'white', lineHeight: 1 }}>3</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(232,234,240,0.4)' }}>across 14 monitored zones</p>
          </div>
        </div>
      </div>

      {/* Center — Login Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="glass-strong w-full max-w-[420px] animate-slide-up space-y-0 overflow-hidden"
          style={{ borderColor: 'rgba(230,57,70,0.20)' }}
        >
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 text-center space-y-3">
            <div className="flex justify-center" style={{ filter: 'drop-shadow(0 0 16px rgba(230,57,70,0.5))' }}>
              <ShieldIcon size={52} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                <span style={{ color: 'white' }}>Crisis</span>
                <span style={{ color: '#E63946' }}>Link</span>
              </h1>
              <p className="mono" style={{ fontSize: 11, color: 'rgba(232,234,240,0.38)', letterSpacing: '0.06em' }}>
                EMERGENCY RESPONSE PLATFORM
              </p>
            </div>
          </div>

          <div className="divider" />

          {/* Login form */}
          <div className="px-8 py-6">
            <LoginForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
          </div>

          {/* Demo accounts */}
          <div className="px-8 pb-6 space-y-3">
            <p className="mono text-center" style={{ fontSize: 10, color: 'rgba(232,234,240,0.30)', letterSpacing: '0.08em' }}>
              DEMO ACCOUNTS — CLICK TO AUTO-FILL
            </p>
            <div className="flex gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <DemoChip 
                  key={acc.email} 
                  account={acc} 
                  onSelect={(e, p) => { setEmail(e); setPassword(p); }} 
                />
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Guest SOS link */}
          <GuestSOSStrip />
        </div>
      </div>

      {/* Right decorative panel */}
      <div className="hidden lg:flex flex-col justify-center px-12 w-80 xl:w-96 animate-fade-in delay-300">
        <div className="glass scan-overlay p-6 space-y-4">
          <p className="mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.1em' }}>
            RECENT ACTIVITY
          </p>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: item.color, border: `0.5px solid ${item.border}` }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-snug" style={{ color: 'rgba(232,234,240,0.80)' }}>{item.text}</p>
                  <p className="mono mt-0.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)' }}>{item.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-ping-slow" style={{ background: '#E63946' }} />
            <p className="mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.06em' }}>
              LIVE MONITORING ACTIVE
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Login Form ──────────────────────────────────────── */
function LoginForm({ email, setEmail, password, setPassword }) {
  const login   = useAuthStore(s => s.login);
  const router  = useRouter();
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/staff/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ color: '#FF6B6B', background: 'rgba(230,57,70,0.12)', border: '0.5px solid rgba(230,57,70,0.30)' }}>
          {error}
        </div>
      )}
      <div>
        <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>
          EMAIL ADDRESS
        </label>
        <input
          id="input-email"
          className="input-glass"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@grandhotel.com"
        />
      </div>
      <div>
        <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>
          PASSWORD
        </label>
        <div className="relative">
          <input
            id="input-password"
            className="input-glass pr-12"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
            style={{ color: 'rgba(232,234,240,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <button
        id="btn-login"
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
        style={{ height: 48, fontSize: 15 }}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Authenticating…
          </>
        ) : (
          <>Sign In →</>
        )}
      </button>
    </form>
  );
}

/* ── Demo Account Chip ───────────────────────────────── */
function DemoChip({ account, onSelect }) {
  return (
    <button
      onClick={() => onSelect(account.email, account.password)}
      className="flex-1 text-center py-2 px-2 rounded-lg transition-all hover:-translate-y-0.5"
      style={{
        background: account.color,
        border: `0.5px solid ${account.border}`,
        cursor: 'pointer',
      }}
    >
      <p className="mono font-bold" style={{ fontSize: 9, color: account.textColor, letterSpacing: '0.06em' }}>
        {account.role.toUpperCase()}
      </p>
      <p className="truncate" style={{ fontSize: 10, color: 'rgba(232,234,240,0.55)', marginTop: 2 }}>
        {account.email.split('@')[0]}
      </p>
    </button>
  );
}

/* ── Guest SOS Strip ─────────────────────────────────── */
function GuestSOSStrip() {
  const router = useRouter();
  return (
    <button
      id="btn-sos-guest"
      onClick={() => router.push('/sos')}
      className="w-full py-4 flex items-center justify-center gap-3 transition-all hover:opacity-90"
      style={{ background: 'rgba(230,57,70,0.10)', borderTop: '0.5px solid rgba(230,57,70,0.20)', cursor: 'pointer' }}
    >
      <span className="w-2 h-2 rounded-full animate-ping-slow" style={{ background: '#E63946' }} />
      <span style={{ color: '#E63946', fontWeight: 600, fontSize: 14 }}>
        Report Emergency without login →
      </span>
    </button>
  );
}
