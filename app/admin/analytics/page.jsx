'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { useMotionValue, useSpring, animate } from 'framer-motion';
import useAuthStore from '@/lib/stores/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export default function AnalyticsPage() {
  return <AppProviders><AnalyticsContent /></AppProviders>;
}

const PIE_COLORS = ['#E63946', '#F4A261', '#FACC15', '#2DC653', '#457B9D', '#8B9CB6'];

function KpiCard({ label, value, suffix = '' }) {
  const numericValue = Number(value) || 0;
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 24, stiffness: 160 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, numericValue, { duration: 1 });
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [numericValue]);

  return (
    <div className="glass p-4 border border-white/10 rounded-xl">
      <p className="text-[11px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-[28px] leading-tight font-bold text-white mt-1">{displayValue}{suffix}</p>
    </div>
  );
}

function AnalyticsContent() {
  const { user } = useAuthStore();
  const router  = useRouter();
  const token = useAuthStore(s => s.token);

  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [user]);

  const load = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('crisislink_token')}` },
      });
      if (res.ok) setData(await res.json());
    } finally { setFetching(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const byType = data?.byType || [];
  const byZone = data?.byZone || [];
  const dailyCounts = data?.dailyCounts || [];

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
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Incidents" value={data?.totalIncidents} />
            <KpiCard label="Active Now" value={data?.activeIncidents} />
            <KpiCard label="Resolved" value={data?.resolvedIncidents} />
            <KpiCard label="Avg Response Time" value={data?.avgResolutionMinutes || 0} suffix="m" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Incidents by Type</h3>
              {fetching ? <div className="skeleton h-56 rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="type" tick={{ fill: '#fff', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#fff', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#101828', border: '1px solid rgba(255,255,255,0.1)' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#E63946" radius={[6, 6, 0, 0]} animationBegin={0} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-white mb-3">By Zone (Top 6)</h3>
              {fetching ? <div className="skeleton h-56 rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byZone} dataKey="count" nameKey="zone" cx="50%" cy="50%" outerRadius={90} animationBegin={0} animationDuration={800}>
                      {byZone.map((entry, index) => (
                        <Cell key={`${entry.zone}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#101828', border: '1px solid rgba(255,255,255,0.1)' }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Daily Trend (30 Days)</h3>
            {fetching ? <div className="skeleton h-56 rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" tick={{ fill: '#8B9CB6', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#8B9CB6', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#101828', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#E63946" strokeWidth={2.5} dot={{ fill: '#E63946', r: 2 }} animationBegin={0} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
