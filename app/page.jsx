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
  return incidents.filter((incident) => incident && incident.status !== 'resolved' && !incident.is_drill);
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

export default function HomePage() {
  return (
    <AppProviders>
      <HomeContent />
    </AppProviders>
  );
}

function TacticalRadar() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center mx-auto my-4">
      <div className="absolute inset-0 border border-red-500/10 rounded-full" />
      <div className="absolute inset-[15%] border border-red-500/15 rounded-full" />
      <div className="absolute inset-[30%] border border-red-500/20 rounded-full" />
      <div className="radar-ring w-full h-full" style={{ animationDelay: '0s' }} />
      <div className="radar-ring w-full h-full" style={{ animationDelay: '1s' }} />
      <div className="radar-ring w-full h-full" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0" style={{ animation: 'radar-rotate 10s linear infinite', background: 'conic-gradient(from 0deg, transparent 80%, rgba(230,57,70,0.2) 100%)', borderRadius: '50%' }} />
      <div className="relative z-10 filter drop-shadow(0 0 12px rgba(230,57,70,0.5))">
        <ShieldIcon size={52} />
      </div>
      {/* Dynamic blips */}
      <motion.div className="absolute top-1/4 right-1/3 w-1.5 h-1.5 bg-red-500 rounded-full" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
      <motion.div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-red-400 rounded-full" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }} />
    </div>
  );
}

function FloatingSOS() {
  const router = useRouter();
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push('/sos')}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-2xl btn-emergency-floating lg:w-24 lg:h-24"
    >
      <div className="relative">
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="currentColor" />
        </svg>
      </div>
      <span className="mono text-[10px] font-black tracking-tighter mt-1">REPORT SOS</span>
    </motion.button>
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
          fetch('/api/analytics/summary', { cache: 'no-store' }),
          fetch('/api/incidents/public?limit=3', { cache: 'no-store' }),
        ]);

        const analyticsPayload = await analyticsRes.json();
        const incidentsPayload = await incidentsRes.json();
        if (cancelled) return;

        if (analyticsRes.ok) setAnalytics(analyticsPayload);
        if (incidentsRes.ok) setActiveIncidents(normalizeActiveIncidents(incidentsPayload.incidents));
      } catch (error) {
        console.error('Failed to load landing page live data:', error);
      }
    };

    loadLiveData();

    let socketRef = null;
    let socketTimer = null;
    let usedIdleCallback = false;

    const connectLiveFeed = () => {
      import('socket.io-client').then(({ io }) => {
        if (cancelled) return;
        socketRef = io(window.location.origin, {
          transports: ['websocket'],
        });

        socketRef.on('incident:new', (incident) => {
          if (!incident || incident.is_drill) return;
          setActiveIncidents((current) => [incident, ...current.filter((item) => item?.id && item.id !== incident.id)].slice(0, 3));
          if (incident?.created_at && isToday(incident.created_at)) {
            setAnalytics((current) => current ? { ...current, totalIncidents: (current.totalIncidents || 0) + 1, activeIncidents: (current.activeIncidents || 0) + 1, todayIncidents: (current.todayIncidents || 0) + 1 } : current);
          }
        });

        socketRef.on('incident:updated', (incident) => {
          if (!incident || incident.is_drill) return;
          setActiveIncidents((current) => {
            const next = current.map((item) => item?.id === incident.id ? { ...item, ...incident } : item);
            return normalizeActiveIncidents(next);
          });
        });
        
        socketRef.on('incident:deleted', (deletedId) => {
          if (!deletedId) return;
          setActiveIncidents((current) => current.filter((item) => item?.id !== deletedId));
        });

        socketRef.on('incidents:wiped', () => {
          setActiveIncidents([]);
          setAnalytics((current) => current ? { ...current, totalIncidents: 0, activeIncidents: 0, todayIncidents: 0 } : current);
        });
      }).catch((error) => {
        console.error('Failed to subscribe to landing page socket feed:', error);
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      usedIdleCallback = true;
      socketTimer = window.requestIdleCallback(connectLiveFeed, { timeout: 2000 });
    } else {
      socketTimer = window.setTimeout(connectLiveFeed, 1200);
    }

    return () => {
      cancelled = true;
      if (usedIdleCallback && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(socketTimer);
      } else if (socketTimer !== null) {
        window.clearTimeout(socketTimer);
      }
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

    return () => {
      observer.disconnect();
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
      if ((event.key === 'd' || event.key === 'D') && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') startDemo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoStarting]);

  const tickerItems = useMemo(() => {
    if (activeIncidents.length === 0) {
      return ['SYSTEM ACTIVE', 'ALL CLEAR', 'MONITORING 14 ZONES', 'AI TRIAGE READY'];
    }
    return activeIncidents
      .filter(Boolean)
      .map((incident) => `${String(incident.type || 'incident').toUpperCase()} · ${incident.zone || 'Unknown'} · ${String(incident.severity || 'active').toUpperCase()}`);
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
      <section className="max-w-[1536px] mx-auto px-4 pt-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="animate-on-scroll hidden lg:block lg:col-span-3 space-y-6">
            <div className="hud-panel glass-dark">
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

          <section className="animate-on-scroll lg:col-span-6 space-y-6">
            <div className="glass-strong w-full max-w-[480px] mx-auto overflow-hidden border border-red-500/20">
              <div className="px-5 pt-6 pb-4 text-center space-y-3">
                <div className="flex justify-center" style={{ filter: 'drop-shadow(0 0 16px rgba(230,57,70,0.5))' }}>
                  <ShieldIcon size={36} />
                </div>
                <div className="space-y-3">
                  <p className="mono text-[11px] text-white/40 tracking-[0.24em]">EMERGENCY RESPONSE PLATFORM</p>
                  <h1 className="display-text">
                    <span className="text-white">Crisis</span>
                    <span className="text-red-500">Link</span>
                  </h1>
                  <p className="max-w-2xl mx-auto text-base sm:text-lg text-white/50 leading-relaxed">
                    Unified venue incident coordination for modern hospitality. Real-time AI triage, instant guest SOS, and secure responder workflows.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {activeIncidents.length > 0 ? (
                    activeIncidents.slice(0, 3).map((incident) => incident?.id && (
                      <span
                        key={incident.id}
                        className="px-4 py-2 rounded-full text-[11px] font-bold tracking-wider border transition-all hover:bg-white/5"
                        style={{
                          background: incident.severity === 'critical' ? 'rgba(230,57,70,0.12)' : 'rgba(255,255,255,0.03)',
                          borderColor: incident.severity === 'critical' ? 'rgba(230,57,70,0.25)' : 'rgba(255,255,255,0.08)',
                          color: incident.severity === 'critical' ? '#FF6B6B' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        ● {String(incident.type || 'incident').toUpperCase()} · {incident.zone}
                      </span>
                    ))
                  ) : (
                    <span className="px-4 py-2 rounded-full text-[11px] font-bold tracking-wider border border-white/5 bg-white/2 text-white/40">
                      SYSTEM NOMINAL · MONITORING ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="divider" />

              <div className="px-5 py-4">
                <LoginForm email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
              </div>

              <div className="px-5 pb-4 space-y-4">
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
                    className="border border-emergency text-emergency hover:bg-emergency hover:text-white transition-all px-6 py-2 rounded-xl font-semibold text-sm"
                  >
                    ▶ Watch Live Demo
                  </button>
                </div>
              </div>

              <div className="divider" />
              <GuestSOSStrip />
              <GuestTracker />
            </div>

          </section>

          <aside className="animate-on-scroll hidden lg:block lg:col-span-3 space-y-6">
            <div className="hud-panel glass-dark">
              <div className="flex items-center justify-between mb-4">
                <p className="mono text-[10px] text-white/35 tracking-[0.2em]">LIVE INCIDENT FEED</p>
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 mono text-[9px] border border-red-500/20">{activeIncidents.length} ACTIVE</span>
              </div>
              <div className="space-y-4">
                {activeIncidents.length === 0 ? (
                  <p className="text-xs italic text-white/30 text-center py-8">Awaiting incident stream...</p>
                ) : (
                  activeIncidents.slice(0, 3).map((incident) => incident?.id && (
                    <div key={incident.id} className="relative pl-4 group">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/10 group-hover:bg-red-500 transition-colors" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-white/80">{String(incident.type || 'incident').toUpperCase()}</span>
                        <span className="text-[9px] mono text-white/30">{incident.zone}</span>
                      </div>
                      <p className="text-[11px] text-white/45 mt-1 line-clamp-2">{incident.description || 'No description provided.'}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="divider my-6" />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping opacity-50" />
                </div>
                <p className="mono text-[9px] text-white/30 tracking-widest">ENCRYPTED SOCKET ACTIVE</p>
              </div>
            </div>
          </aside>
        </div>

        {/* Feature Bento Grid — full width below the 3-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-12">
          {/* Feature 1: AI Triage (Large) */}
          <article className="glass-bento col-span-1 md:col-span-4 p-8 flex flex-col justify-between min-h-[260px] group">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                  <span className="text-xl">🤖</span>
                </div>
                <p className="mono text-[10px] tracking-[0.3em] text-red-400">01. ARTIFICIAL INTELLIGENCE</p>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">Eight-step SOP guidance in seconds</h2>
              <p className="text-sm text-white/40 max-w-md leading-relaxed">
                Automated severity analysis and evacuation protocols generated instantly for every verified alert.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] mono text-white/25 mt-4">
              <span className="w-1 h-1 rounded-full bg-green-500/50" />
              ANALYSIS ENGINE ONLINE
            </div>
          </article>

          {/* Feature 2: Live Command (Medium) */}
          <article className="glass-bento col-span-1 md:col-span-2 p-7 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                <span className="text-xl">📡</span>
              </div>
              <div>
                <p className="mono text-[10px] tracking-[0.2em] text-blue-400">02. COMMAND</p>
                <h2 className="text-lg font-bold text-white mt-1 leading-snug">Venue-wide coordination</h2>
              </div>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Real-time maps and secure channels in one workspace.
            </p>
          </article>

          {/* Feature 3: Guest SOS */}
          <article className="glass-bento col-span-1 md:col-span-3 p-7 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                <span className="text-xl">🆘</span>
              </div>
              <div>
                <p className="mono text-[10px] tracking-[0.2em] text-amber-400">03. GUEST SOS</p>
                <h2 className="text-lg font-bold text-white mt-1 leading-snug">Instant Incident Reporting</h2>
              </div>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Fast QR reporting with live tracking status for guest safety.
            </p>
          </article>

          {/* Feature 4: Uptime Stat */}
          <article className="glass-bento col-span-1 md:col-span-3 p-7 flex items-center justify-between group overflow-hidden relative">
            <div className="relative z-10">
              <p className="mono text-[10px] tracking-[0.2em] text-white/30 uppercase">Uptime Reliability</p>
              <p className="text-3xl font-black text-white mt-1">99.99<span className="text-sm text-white/30">%</span></p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-red-500/5 to-transparent flex items-center justify-center opacity-30">
              <div className="w-12 h-12 rounded-full border border-white/5 animate-ping" />
            </div>
          </article>
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

      <FloatingSOS />
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
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-lg"
            style={{ color: 'rgba(232,234,240,0.35)', background: 'none', border: 'none' }}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <button id="btn-login" type="submit" disabled={loading} className="btn-primary w-full" style={{ height: 38, fontSize: 13 }}>
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
      className="w-full py-2.5 flex items-center justify-center gap-3 transition-all hover:opacity-90"
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
  const [checking, setChecking] = useState(false);
  const [trackError, setTrackError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const id = trackingId.trim();
    if (!id) return;
    setTrackError('');
    setChecking(true);
    try {
      // Validate the incident ID exists before navigating
      const res = await fetch(`/api/incidents/public?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      const found = res.ok && (Array.isArray(data?.incidents) ? data.incidents.length > 0 : data?.id);
      if (!found) {
        setTrackError('No incident found with that ID. Please check and try again.');
        return;
      }
      router.push(`/sos/confirm/${id}`);
    } catch {
      setTrackError('Could not verify tracking ID. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full py-2.5 px-5 flex flex-col gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <p className="mono text-[9px] text-white/50 tracking-[0.16em]">TRACK INCIDENT</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => { setTrackingId(e.target.value); setTrackError(''); }}
          placeholder="Enter Tracking ID (e.g. INC-20260427-1234)"
          className="input-glass flex-1 !py-1.5 text-sm"
          style={{ height: 38 }}
          disabled={checking}
        />
        <button
          type="submit"
          disabled={checking || !trackingId.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-white/10 disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: 'white', height: 38 }}
        >
          {checking ? '⏳ Checking…' : 'Track Status'}
        </button>
      </div>
      {trackError && (
        <p className="text-xs text-red-400/90" style={{ paddingLeft: 2 }}>{trackError}</p>
      )}
    </form>
  );
}
