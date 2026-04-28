'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import IncidentCard from '@/components/IncidentCard';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';
import useUIStore from '@/lib/stores/uiStore';

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ label, value, icon, sub, accentColor = '#E8EAF0', borderColor = 'rgba(255,255,255,0.08)', highlight }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col justify-between"
      style={{
        padding: '18px 20px',
        background: highlight
          ? `linear-gradient(135deg, ${highlight}18 0%, ${highlight}08 100%)`
          : 'rgba(255,255,255,0.035)',
        border: `0.5px solid ${borderColor}`,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.38)', letterSpacing: '0.08em' }}>
            {label.toUpperCase()}
          </span>
          <span
            className="font-black count-flip leading-none"
            style={{ fontSize: 'clamp(24px, 5vw, 34px)', color: accentColor }}
          >
            {value ?? '—'}
          </span>
        </div>
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.06)', fontSize: 20 }}
        >
          {icon}
        </div>
      </div>
      {/* Sub */}
      {sub && (
        <p className="mt-3 mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.04em' }}>
          {sub}
        </p>
      )}
      {/* Decorative corner glow */}
      {highlight && (
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${highlight}22 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
        />
      )}
    </div>
  );
}

/* ── Section Label ───────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="mono mb-3" style={{ fontSize: 10, color: 'rgba(232,234,240,0.30)', letterSpacing: '0.10em' }}>
      {children}
    </p>
  );
}

export default function AdminDashboard() {
  return (
    <AppProviders>
      <DashboardContent />
    </AppProviders>
  );
}

function DashboardContent() {
  const { user, loading }  = useAuthStore();
  const router    = useRouter();
  const { incidents, fetchIncidents } = useIncidentStore();
  const connected = useSocketStore(s => s.connected);
  const broadcasts = useSocketStore(s => s.broadcasts);
  const drillMode = useUIStore(s => s.drillMode);
  const toggleDrill = useUIStore(s => s.toggleDrillMode);
  const addToast  = useUIStore(s => s.addToast);

  const [analytics, setAnalytics] = useState(null);
  const [demoing, setDemoing]     = useState(false);
  const [filter, setFilter]       = useState('active');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showBroadcastOverlay, setShowBroadcastOverlay] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  const load = useCallback(async () => {
    await fetchIncidents({});
    const res = await fetch('/api/analytics', {
      headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
    });
    if (res.ok) setAnalytics(await res.json());
  }, []);

  useEffect(() => { load(); }, []);

  const activeInc   = (incidents || []).filter(i => i && i.status !== 'resolved');
  const criticalInc = (incidents || []).filter(i => i && i.severity === 'critical' && i.status !== 'resolved');

  const filtered = filter === 'active'
    ? (incidents || []).filter(i => i && i.status !== 'resolved')
    : filter === 'resolved'
      ? (incidents || []).filter(i => i && i.status === 'resolved')
      : (incidents || []);

  const triggerDemo = async () => {
    setDemoing(true);
    try {
      addToast({ message: `Phase 1: Intercepting SOS...`, type: 'info' });
      await new Promise(r => setTimeout(r, 1000));
      
      addToast({ message: `Phase 2: AI Triage Analyzing...`, type: 'info' });
      await new Promise(r => setTimeout(r, 1000));

      const res = await fetch('/api/demo/trigger', { method: 'POST' });
      const data = await res.json();
      
      addToast({ message: `Phase 3: Critical Alert Dispatched!`, type: 'success' });
      
      setTimeout(() => {
        router.push(`/admin/incidents/${data.incident.id}`);
      }, 1500);
    } catch (e) { addToast({ message: 'Demo trigger failed', type: 'error' }); }
    finally { setDemoing(false); }
  };

  const criticalIncCount = criticalInc.length;

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim() || sendingBroadcast) return;
    try {
      setSendingBroadcast(true);
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('crisislink_token')}`,
        },
        body: JSON.stringify({ message: broadcastMessage.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to send broadcast');
      setBroadcastMessage('');
      setShowBroadcastOverlay(true);
      setTimeout(() => setShowBroadcastOverlay(false), 2000);
    } catch (e) {
      addToast({ message: e.message || 'Failed to send broadcast', type: 'error' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#05070F' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-red-500 border-white/10 animate-spin mx-auto" />
        <p className="mono" style={{ fontSize: 11, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.08em' }}>
          LOADING…
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05070F' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Critical alert banner */}
          {criticalInc.length > 0 && (
            <div
              className="flex items-center gap-4 rounded-2xl px-5 py-4 animate-slide-up emergency-flash"
              style={{
                background: 'rgba(230,57,70,0.10)',
                border: '0.5px solid rgba(230,57,70,0.35)',
                boxShadow: '0 0 30px rgba(230,57,70,0.15)',
              }}
            >
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full" style={{ background: '#E63946' }} />
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: '#E63946', opacity: 0.4 }} />
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ fontSize: 14, color: '#FF8080' }}>
                  {criticalInc.length} CRITICAL INCIDENT{criticalInc.length > 1 ? 'S' : ''} ACTIVE — Immediate Response Required
                </p>
                <p className="mono" style={{ fontSize: 10, color: 'rgba(230,57,70,0.60)', letterSpacing: '0.04em', marginTop: 2 }}>
                  {criticalInc.map(i => i?.zone || 'Unknown').join(' · ')}
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/incidents')}
                className="flex-shrink-0 px-4 py-2 rounded-xl font-bold transition-all hover:bg-red-500/30"
                style={{ fontSize: 12, background: 'rgba(230,57,70,0.18)', color: '#FF8080', border: '0.5px solid rgba(230,57,70,0.40)' }}
              >
                View All →
              </button>
            </div>
          )}

          {/* Drill mode banner */}
          {drillMode && (
            <div
              className="rounded-2xl px-5 py-3 flex items-center gap-3"
              style={{ background: 'rgba(249,115,22,0.12)', border: '0.5px solid rgba(249,115,22,0.35)' }}
            >
              <span style={{ fontSize: 16 }}>⚡</span>
              <p className="mono font-bold flex-1" style={{ fontSize: 11, color: '#FDBA74', letterSpacing: '0.08em' }}>
                DRILL MODE ACTIVE — All incidents are simulated
              </p>
              <button
                onClick={toggleDrill}
                className="px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-orange-500/20"
                style={{ fontSize: 11, color: '#FDBA74', background: 'rgba(249,115,22,0.14)', border: '0.5px solid rgba(249,115,22,0.35)' }}
              >
                End Drill
              </button>
            </div>
          )}

          {/* Action toolbar */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 flex-wrap"
            style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <button
              id="btn-new-incident"
              onClick={() => router.push('/admin/incidents/new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all"
              style={{ fontSize: 13, background: '#E63946', color: 'white', border: 'none', boxShadow: '0 0 16px rgba(230,57,70,0.40)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FF4757'; e.currentTarget.style.boxShadow = '0 0 24px rgba(230,57,70,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E63946'; e.currentTarget.style.boxShadow = '0 0 16px rgba(230,57,70,0.40)'; }}
            >
              <span>+</span> New Incident
            </button>

            <button
              onClick={triggerDemo}
              disabled={demoing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-50"
              style={{ fontSize: 12, background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '0.5px solid rgba(168,85,247,0.28)' }}
            >
              {demoing ? '⏳ Generating…' : '🎭 Demo Autopilot'}
            </button>

            <button
              onClick={toggleDrill}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all"
              style={{
                fontSize: 12,
                background: drillMode ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.05)',
                color: drillMode ? '#C084FC' : 'rgba(232,234,240,0.45)',
                border: `0.5px solid ${drillMode ? 'rgba(168,85,247,0.38)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              {drillMode ? '⚡ Drill ON' : '⚪ Drill Mode'}
            </button>

            <button
              onClick={() => router.push('/qr')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all hover:bg-white/8"
              style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', color: 'rgba(232,234,240,0.45)', border: '0.5px solid rgba(255,255,255,0.10)' }}
            >
              📱 QR Codes
            </button>

            <div className="ml-auto flex-shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? '#2DC653' : '#E63946', boxShadow: connected ? '0 0 5px #2DC653' : '0 0 5px #E63946' }} />
              <span className="mono" style={{ fontSize: 10, color: 'rgba(232,234,240,0.35)', letterSpacing: '0.05em' }}>
                {connected ? 'LIVE SYNC' : 'RECONNECTING…'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div>
            <SectionLabel>— COMMAND OVERVIEW</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                label="Active Incidents"
                value={activeInc.length}
                icon="🚨"
                accentColor={activeInc.length > 0 ? '#FF6B6B' : '#2DC653'}
                borderColor={activeInc.length > 0 ? 'rgba(230,57,70,0.28)' : 'rgba(45,198,83,0.28)'}
                highlight={activeInc.length > 0 ? '#E63946' : '#2DC653'}
              />
              <StatCard
                label="Critical"
                value={criticalInc.length}
                icon="🔴"
                accentColor={criticalInc.length > 0 ? '#FF6B6B' : 'rgba(232,234,240,0.50)'}
                borderColor={criticalInc.length > 0 ? 'rgba(230,57,70,0.28)' : 'rgba(255,255,255,0.08)'}
                highlight={criticalInc.length > 0 ? '#E63946' : null}
              />
              <StatCard
                label="Total Today"
                value={analytics?.todayIncidents}
                icon="📋"
                accentColor="rgba(232,234,240,0.85)"
              />
              <StatCard
                label="Resolved"
                value={analytics?.resolvedIncidents}
                icon="✅"
                accentColor="#2DC653"
                borderColor="rgba(45,198,83,0.20)"
                highlight="#2DC653"
                sub={`Avg ${analytics?.avgResolutionMinutes || 0}m response`}
              />
            </div>
          </div>

          {/* Incident List */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <SectionLabel>— INCIDENT STREAM</SectionLabel>
              <div className="ml-auto flex items-center gap-1.5">
                {['active', 'all', 'resolved'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-lg font-semibold capitalize transition-all mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.05em',
                      background: filter === f ? 'rgba(230,57,70,0.14)' : 'rgba(255,255,255,0.04)',
                      color: filter === f ? '#FF8080' : 'rgba(232,234,240,0.38)',
                      border: `0.5px solid ${filter === f ? 'rgba(230,57,70,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)' }}
              >
                <p style={{ fontSize: 36, marginBottom: 12 }}>✅</p>
                <p className="font-semibold" style={{ fontSize: 14, color: 'rgba(232,234,240,0.55)' }}>No incidents in this view</p>
                <p className="mono mt-1" style={{ fontSize: 11, color: 'rgba(232,234,240,0.28)' }}>Standing by…</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((inc, idx) => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    index={idx}
                    onClick={() => router.push(`/admin/incidents/${inc.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.09)' }}
          >
            <h3 className="font-semibold text-white text-base mb-3">📢 Broadcast Message</h3>
            <textarea
              maxLength={280}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full min-h-28 rounded-xl p-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 outline-none focus:border-white/25"
              placeholder="Type a message for all staff..."
            />
            <p className="text-xs text-muted mt-2">{broadcastMessage.length}/280</p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={sendBroadcast}
                disabled={!broadcastMessage.trim() || sendingBroadcast}
                className="px-4 py-2 rounded-xl font-semibold text-sm text-white bg-red-500/85 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingBroadcast ? 'Sending...' : 'Send to All Staff'}
              </button>
            </div>
            
            {broadcasts?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/10">
                <h4 className="font-semibold text-white/80 text-sm mb-3">Recent Broadcasts (Session)</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {broadcasts.map((b, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex gap-3 text-sm">
                      <span className="text-white/40 text-xs min-w-16 whitespace-nowrap">{new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-white/90">{b.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {showBroadcastOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-[48px]">📢</div>
            <p className="text-white font-bold text-[24px] mt-2">BROADCAST SENT TO ALL STAFF</p>
          </div>
        </div>
      )}
    </div>
  );
}
