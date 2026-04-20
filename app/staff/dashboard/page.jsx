'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import IncidentCard from '@/components/IncidentCard';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';

export default function StaffDashboard() {
  return <AppProviders><StaffContent /></AppProviders>;
}

function StaffContent() {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const router  = useRouter();
  const { incidents, fetchIncidents } = useIncidentStore();
  const connected = useSocketStore(s => s.connected);
  const socket    = useSocketStore(s => s.socket);

  const [ownFilter, setOwnFilter] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading]);

  const load = () => fetchIncidents({});
  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('incident:created', load);
    socket.on('incident:updated', load);
    return () => { socket.off('incident:created', load); socket.off('incident:updated', load); };
  }, [socket]);

  const mine = ownFilter
    ? incidents.filter(i => i.assigned_to === user?.id)
    : incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="font-bold text-white">Staff Dashboard</h1>
            <p className="text-xs text-muted">Hello, {user?.name} · {user?.department}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-xs flex items-center gap-1 ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Offline'}
            </span>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={ownFilter}
                onChange={e => setOwnFilter(e.target.checked)}
                className="accent-steelblue"
              />
              My Assignments
            </label>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick-action SOS card */}
          <div className="glass bg-steelblue/5 border-steelblue/20 p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Need to report an incident?</p>
              <p className="text-xs text-muted">Create a new incident directly from the staff panel</p>
            </div>
            <button
              onClick={() => router.push('/admin/incidents/new')}
              className="px-4 py-2 bg-emergency/80 hover:bg-emergency rounded-lg text-white font-bold text-sm transition-all hover:shadow-glow-red"
            >
              + New Incident
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">{ownFilter ? 'My Assignments' : 'Active Incidents'} ({mine.length})</h2>
          </div>

          {mine.length === 0 ? (
            <div className="glass p-16 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-semibold text-white">All clear!</p>
              <p className="text-xs text-muted mt-1">No active incidents at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mine.map(inc => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  onClick={() => router.push(`/admin/incidents/${inc.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
