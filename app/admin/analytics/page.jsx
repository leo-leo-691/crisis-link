'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { IncidentsByTypeChart, ZoneBarChart, TrendLineChart, HourlyBarChart } from '@/components/AnalyticsCharts';
import VenueMap from '@/components/VenueMap';
import useAuthStore from '@/lib/stores/authStore';
import useSocketStore from '@/lib/stores/socketStore';

export default function AnalyticsPage() {
  return <AppProviders><AnalyticsContent /></AppProviders>;
}

function StatPill({ label, value, color = 'bg-white/8', icon }) {
  return (
    <div className={`${color} border border-white/10 rounded-xl p-4 space-y-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-extrabold text-white">{value ?? '—'}</span>
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function AnalyticsContent() {
  const { user } = useAuthStore();
  const router  = useRouter();
  const token   = useAuthStore(s => s.token);
  const liveAnalytics = useSocketStore(s => s.liveAnalytics);

  const [data, setData]     = useState(null);
  const [fetching, setFetching] = useState(true);
  const [range, setRange]   = useState('7d');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [user]);

  const load = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('crisislink_token')}` },
      });
      if (res.ok) setData(await res.json());
    } finally { setFetching(false); }
  };

  useEffect(() => { if (user) load(); }, [user, range]);

  // Merge with live analytics socket data
  const summary  = liveAnalytics?.summary || data?.summary;
  const byType   = data?.byType || [];
  const byZone   = data?.byZone || [];
  const trend    = data?.trend  || [];
  const byHour   = data?.byHour || [];

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="font-bold text-white text-lg">Live Analytics</h1>
            <p className="text-xs text-muted">Incident insights &amp; venue heatmap</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {['7d', '30d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all
                  ${range === r ? 'bg-steelblue/30 border border-steelblue/40 text-white' : 'text-muted hover:text-white border border-white/10'}`}
              >
                {r}
              </button>
            ))}
            <button
              id="btn-export-analytics"
              onClick={() => window.open('/api/analytics?format=csv', '_blank')}
              className="px-3 py-1.5 text-xs bg-white/6 hover:bg-white/12 border border-white/10 rounded-lg text-muted hover:text-white"
            >
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary pills */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatPill icon="📋" label="Total Incidents" value={summary?.total}       />
            <StatPill icon="🔴" label="Critical"        value={summary?.critical}    color="border-red-500/20 bg-red-500/5"  />
            <StatPill icon="✅" label="Resolved"        value={summary?.resolved}    color="border-emerald-500/20 bg-emerald-500/5" />
            <StatPill icon="⏱️" label="Avg Response"   value={data?.avgResponseMinutes != null ? `${data.avgResponseMinutes}m` : '—'} />
            <StatPill icon="🔵" label="Drills"          value={summary?.drills}      color="border-purple-500/20 bg-purple-500/5" />
          </div>

          {/* Charts row */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Incidents by Type</h3>
              {fetching ? <div className="skeleton h-56 rounded-lg" /> : <IncidentsByTypeChart data={byType} />}
            </div>
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">By Zone (Top 10)</h3>
              {fetching ? <div className="skeleton h-56 rounded-lg" /> : <ZoneBarChart data={byZone.slice(0, 10)} />}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Daily Trend</h3>
              {fetching ? <div className="skeleton h-44 rounded-lg" /> : <TrendLineChart data={trend} />}
            </div>
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Incidents by Hour of Day</h3>
              {fetching ? <div className="skeleton h-44 rounded-lg" /> : <HourlyBarChart data={byHour} />}
            </div>
          </div>

          {/* Venue heatmap */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Venue Incident Heatmap</h3>
              <p className="text-xs text-muted">Darker zones = more incidents</p>
            </div>
            <VenueMap incidents={[]} zones={byZone} mode="heatmap" />
          </div>
        </div>
      </main>
    </div>
  );
}
