'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppProviders from '@/components/AppProviders';
import useAuthStore from '@/lib/stores/authStore';

const DEMO_ACCOUNTS = [
  { email: 'admin@grandhotel.com', password: 'demo1234', role: 'Admin', color: 'rgba(230,57,70,0.20)', border: 'rgba(230,57,70,0.40)', textColor: '#FF6B6B' },
  { email: 'manager@grandhotel.com', password: 'demo1234', role: 'Manager', color: 'rgba(244,162,97,0.18)', border: 'rgba(244,162,97,0.38)', textColor: '#F4A261' },
  { email: 'staff@grandhotel.com', password: 'demo1234', role: 'Staff', color: 'rgba(69,123,157,0.20)', border: 'rgba(69,123,157,0.40)', textColor: '#7DBFEF' },
];

const FEATURE_CARDS = [
  {
    eyebrow: 'AI TRIAGE',
    title: 'Eight-step SOP guidance in seconds',
    body: 'Every real alert gets severity analysis, recommended actions, evacuation guidance, and a clear do-not-do list.',
  },
  {
    eyebrow: 'LIVE COMMAND',
    title: 'Venue-wide coordination without tab chaos',
    body: 'Incidents, map overlays, chat, broadcast, handoff, and timeline live in one response workspace.',
  },
  {
    eyebrow: 'GUEST SOS',
    title: 'Fast reporting from QR or direct access',
    body: 'Guests can submit emergencies instantly and track live response status from the confirmation page.',
  },
];

function isToday(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function normalizeActiveIncidents(payload) {
  const incidents = Array.isArray(payload) ? payload : [];
  return incidents.filter((incident) => incident.status !== 'resolved' && !incident.is_drill);
}

export default function HomePage() {
  return (
    <AppProviders>
      <HomeContent />
    </AppProviders>
  );
}

function ShieldIcon({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 2L4 11V30C4 42.5 14 53.5 26 58C38 53.5 48 42.5 48 30V11L26 2Z" fill="rgba(230,57,70,0.18)" stroke="#E63946" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M26 2L4 11V30C4 42.5 14 53.5 26 58C38 53.5 48 42.5 48 30V11L26 2Z" fill="url(#shield-gradient)" opacity="0.6" />
      <path d="M22 28L25 31L31 22" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 15V35M18 24H34" stroke="rgba(230,57,70,0.45)" strokeWidth="1" strokeLinecap="round" />
      <defs>
        <linearGradient id="shield-gradient" x1="4" y1="2" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E63946" stopOpacity="0.3" />
          <stop offset="1" stopColor="#E63946" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HomeContent() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [demoStarting, setDemoStarting] = useState(false);
  const [demoCountdown, setDemoCountdown] = useState(3);

  useEffect(() => {
    if (!loading && user && !demoStarting) {
      if (user.role === 'admin') router.replace('/admin/dashboard');
      else router.replace('/staff/dashboard');
    }
  }, [user, loading, router, demoStarting]);

  useEffect(() => {
    let cancelled = false;

    const loadLiveData = async () => {
      try {
        const [analyticsRes, incidentsRes] = await Promise.all([
          fetch('/api/analytics', { cache: 'no-store' }),
          fetch('/api/incidents?status=active&is_drill=false&limit=3', { cache: 'no-store' }),
        ]);

        const analyticsPayload = await analyticsRes.json();
        const incidentsPayload = await incidentsRes.json();
        if (cancelled) return;

        if (analyticsRes.ok) setAnalytics(analyticsPayload);
        if (incidentsRes.ok) setActiveIncidents(normalizeActiveIncidents(incidentsPayload));
      } catch (error) {
        console.error('Failed to load landing page live data:', error);
      }
    };

    loadLiveData();

    let socketRef = null;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      socketRef = io(window.location.origin, {
        transports: ['websocket', 'polling'],
      });

      socketRef.on('incident:new', (incident) => {
        if (incident?.is_drill) return;
        setActiveIncidents((current) => [incident, ...current.filter((item) => item.id !== incident.id)].slice(0, 3));
        if (incident?.created_at && isToday(incident.created_at)) {
          setAnalytics((current) => current ? { ...current, totalIncidents: (current.totalIncidents || 0) + 1, activeIncidents: (current.activeIncidents || 0) + 1, todayIncidents: (current.todayIncidents || 0) + 1 } : current);
        }
      });

      socketRef.on('incident:updated', (incident) => {
        if (!incident || incident.is_drill) return;
        setActiveIncidents((current) => {
          const next = current.map((item) => item.id === incident.id ? { ...item, ...incident } : item);
          return normalizeActiveIncidents(next);
        });
      });
    }).catch((error) => {
      console.error('Failed to subscribe to landing page socket feed:', error);
    });

    return () => {
      cancelled = true;
      if (socketRef) socketRef.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    const nodes = document.querySelectorAll('.animate-on-scroll');
    nodes.forEach((node) => observer.observe(node));

    let frameId = null;
    let lenis = null;

    if (window.Lenis) {
      lenis = new window.Lenis({ duration: 0.8, smooth: true });
      const raf = (time) => {
        lenis.raf(time);
        frameId = window.requestAnimationFrame(raf);
      };
      frameId = window.requestAnimationFrame(raf);
    }

    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
      if (lenis) lenis.destroy();
    };
  }, []);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const startDemo = async () => {
    if (demoStarting) return;
    try {
      setDemoStarting(true);
      for (let sec = 3; sec >= 1; sec -= 1) {
        setDemoCountdown(sec);
        await wait(1000);
      }

      await login('staff@grandhotel.com', 'demo1234');
      const token = typeof window !== 'undefined' ? localStorage.getItem('crisislink_token') : '';
      await wait(1200);

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'medical',
          zone: 'Restaurant',
          description: 'Guest collapsed near table 12 unconscious',
          reporter_name: 'Demo Guest',
          reporter_type: 'guest',
          is_drill: true,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.incident?.id) {
        throw new Error(payload?.error || 'Failed to create demo incident');
      }

      sessionStorage.setItem('crisislink_demo_autopilot', JSON.stringify({
        active: true,
        incidentId: payload.incident.id,
        startedAt: Date.now(),
        phase: 'created',
      }));

      router.push('/staff/dashboard');
    } catch (err) {
      console.error('Demo autopilot failed', err);
    } finally {
      setDemoStarting(false);
    }
  };

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'd' || event.key === 'D') startDemo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoStarting]);

  const tickerItems = useMemo(() => {
    if (activeIncidents.length === 0) {
      return ['SYSTEM ACTIVE', 'ALL CLEAR', 'MONITORING 14 ZONES', 'AI TRIAGE READY'];
    }
    return activeIncidents.map((incident) => `${String(incident.type || 'incident').toUpperCase()} · ${incident.zone} · ${String(incident.severity || 'active').toUpperCase()}`);
  }, [activeIncidents]);

  return (
    <main
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 10%, rgba(230,57,70,0.10) 0%, transparent 45%), radial-gradient(ellipse at 80% 15%, rgba(69,123,157,0.08) 0%, transparent 45%), #05070F',
        backgroundImage: `
          radial-gradient(ellipse at 20% 10%, rgba(230,57,70,0.10) 0%, transparent 45%),
          radial-gradient(ellipse at 80% 15%, rgba(69,123,157,0.08) 0%, transparent 45%),
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, auto, 60px 60px, 60px 60px',
      }}
    >
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-6 items-start">
          <aside className="animate-on-scroll hidden lg:block">
            <div className="glass p-6 space-y-5">
              <p className="mono text-[10px] uppercase tracking-widest text-red-300">SYSTEM STATUS</p>
              <div className="space-y-3">
                {[
                  { label: 'Emergency Network', status: 'OPERATIONAL' },
                  { label: 'AI Triage Engine', status: 'OPERATIONAL' },
                  { label: 'Alert Broadcasting', status: 'OPERATIONAL' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-white/65">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-ping-slow" style={{ boxShadow: '0 0 6px #2DC653' }} />
                      <span className="mono text-[10px] tracking-wide text-green-400">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div>
                <p className="mono text-[10px] uppercase tracking-widest mb-2 text-white/35">TOTAL INCIDENTS MANAGED</p>
                <p className="font-bold count-flip text-white leading-none" style={{ fontSize: 48 }}>{analytics?.totalIncidents || 0}</p>
                <p className="text-xs mt-1 text-white/45">Real incident total from live analytics</p>
              </div>
            </div>
          </aside>

          <section className="animate-on-scroll space-y-6">
            <div className="glass-strong w-full max-w-[760px] mx-auto overflow-hidden border border-red-500/20">
              <div className="px-8 pt-8 pb-6 text-center space-y-4">
                <div className="flex justify-center" style={{ filter: 'drop-shadow(0 0 16px rgba(230,57,70,0.5))' }}>
                  <ShieldIcon size={56} />
                </div>
                <div className="space-y-3">
                  <p className="mono text-[11px] text-white/40 tracking-[0.24em]">EMERGENCY RESPONSE PLATFORM</p>
                  <h1 className="display-text">
                    <span className="text-white">Crisis</span>
                    <span className="text-red-500">Link</span>
                  </h1>
                  <p className="max-w-2xl mx-auto text-sm sm:text-base text-white/60">
                    Live venue incident coordination for hospitality teams, with AI triage, instant guest SOS intake, and drill-safe response workflows.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {activeIncidents.length > 0 ? (
                    activeIncidents.slice(0, 3).map((incident) => (
                      <span
                        key={incident.id}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        style={{
                          background: incident.severity === 'critical' ? 'rgba(230,57,70,0.18)' : 'rgba(255,255,255,0.06)',
                          borderColor: incident.severity === 'critical' ? 'rgba(230,57,70,0.35)' : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        {String(incident.type || 'incident').toUpperCase()} · {incident.zone}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-white/75">
                      SYSTEM ACTIVE · ALL CLEAR
                    </span>
                  )}
                </div>
              </div>

              <div className="divider" />

              <div className="px-8 py-6">
                <LoginForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
              </div>

              <div className="px-8 pb-6 space-y-4">
                <p className="mono text-center text-[10px] text-white/30 tracking-[0.20em]">DEMO ACCOUNTS — CLICK TO AUTO-FILL</p>
                <motion.div className="flex gap-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}>
                  {DEMO_ACCOUNTS.map((account) => (
                    <motion.div key={account.email} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="flex-1">
                      <DemoChip account={account} onSelect={(nextEmail, nextPassword) => { setEmail(nextEmail); setPassword(nextPassword); }} />
                    </motion.div>
                  ))}
                </motion.div>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={startDemo}
                    className="border border-emergency text-emergency hover:bg-emergency hover:text-white transition-all px-8 py-3 rounded-xl font-semibold"
                  >
                    ▶ Watch Live Demo
                  </button>
                </div>
              </div>

              <div className="divider" />
              <GuestSOSStrip />
              <GuestTracker />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {FEATURE_CARDS.map((card) => (
                <article key={card.eyebrow} className="glass p-5 animate-on-scroll">
                  <p className="mono text-[10px] tracking-[0.18em] text-red-300">{card.eyebrow}</p>
                  <h2 className="text-white font-semibold text-xl mt-3">{card.title}</h2>
                  <p className="text-sm text-white/60 mt-2 leading-relaxed">{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="animate-on-scroll hidden lg:block">
            <div className="glass p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="mono text-[10px] text-white/35 tracking-[0.18em]">LIVE INCIDENT FEED</p>
                <span className="mono text-[10px] text-red-300 tracking-[0.12em]">{activeIncidents.length} ACTIVE</span>
              </div>
              <div className="space-y-3">
                {activeIncidents.length === 0 ? (
                  <p className="text-sm italic text-white/50">No live incidents in the database right now.</p>
                ) : (
                  activeIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{String(incident.type || 'incident').toUpperCase()}</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/40">{incident.zone}</span>
                      </div>
                      <p className="text-xs text-white/55 mt-1">{incident.description || 'No description provided.'}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="divider" />
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-ping-slow" style={{ background: '#E63946' }} />
                <p className="mono text-[10px] text-white/40 tracking-[0.08em]">SOCKET STREAM LISTENING FOR INCIDENT:NEW</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="border-y border-white/8 bg-black/30 overflow-hidden">
        <div className="animate-ticker whitespace-nowrap py-3">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`} className="mono text-[11px] tracking-[0.16em] text-white/55 mx-6">
              {item}
            </span>
          ))}
        </div>
      </div>

      {demoStarting && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="glass-strong p-8 text-center border border-white/15 rounded-2xl min-w-[320px]">
            <p className="text-2xl mb-2">{`\u{1F3AC} Demo Starting in ${demoCountdown}...`}</p>
            <p className="text-sm text-white/60">Preparing live incident simulation</p>
          </div>
        </div>
      )}
    </main>
  );
}

function LoginForm({ email, setEmail, password, setPassword }) {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
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
        <label className="mono block mb-1.5 text-[10px] text-white/40 tracking-[0.16em]">EMAIL ADDRESS</label>
        <input
          id="input-email"
          className="input-glass"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@grandhotel.com"
        />
      </div>
      <div>
        <label className="mono block mb-1.5 text-[10px] text-white/40 tracking-[0.16em]">PASSWORD</label>
        <div className="relative">
          <input
            id="input-password"
            className="input-glass pr-12"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
            style={{ color: 'rgba(232,234,240,0.35)', background: 'none', border: 'none' }}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <button id="btn-login" type="submit" disabled={loading} className="btn-primary w-full" style={{ height: 48, fontSize: 15 }}>
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

function DemoChip({ account, onSelect }) {
  return (
    <button
      onClick={() => onSelect(account.email, account.password)}
      className="flex-1 text-center py-2 px-2 rounded-lg transition-all hover:-translate-y-0.5"
      style={{
        background: account.color,
        border: `0.5px solid ${account.border}`,
      }}
    >
      <p className="mono font-bold text-[9px] tracking-[0.06em]" style={{ color: account.textColor }}>
        {account.role.toUpperCase()}
      </p>
      <p className="truncate text-[10px] text-white/55 mt-0.5">
        {account.email.split('@')[0]}
      </p>
    </button>
  );
}

function GuestSOSStrip() {
  const router = useRouter();

  return (
    <button
      id="btn-sos-guest"
      onClick={() => router.push('/sos')}
      className="w-full py-4 flex items-center justify-center gap-3 transition-all hover:opacity-90"
      style={{ background: 'rgba(230,57,70,0.10)', borderTop: '0.5px solid rgba(230,57,70,0.20)' }}
    >
      <span className="w-2 h-2 rounded-full animate-ping-slow" style={{ background: '#E63946' }} />
      <span style={{ color: '#E63946', fontWeight: 600, fontSize: 14 }}>
        Report Emergency without login →
      </span>
    </button>
  );
}

function GuestTracker() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    router.push(`/sos/confirm/${trackingId.trim()}`);
  };

  return (
    <form onSubmit={submit} className="w-full py-4 px-6 flex flex-col sm:flex-row items-center gap-3 transition-all" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <p className="mono text-[10px] text-white/50 tracking-[0.16em] sm:hidden w-full text-left mb-1">TRACK INCIDENT</p>
      <input
        type="text"
        value={trackingId}
        onChange={(e) => setTrackingId(e.target.value)}
        placeholder="Enter Tracking ID..."
        className="input-glass flex-1 !py-2 text-sm w-full"
        style={{ height: 42 }}
      />
      <button
        type="submit"
        className="px-5 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-white/10 w-full sm:w-auto"
        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: 'white', height: 42 }}
      >
        Track Status
      </button>
    </form>
  );
}
