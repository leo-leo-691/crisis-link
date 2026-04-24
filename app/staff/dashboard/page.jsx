'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import IncidentCard from '@/components/IncidentCard';
import VenueMap from '@/components/VenueMap';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';
import { AnimatePresence } from 'framer-motion';

export default function StaffDashboard() {
  return <AppProviders><StaffContent /></AppProviders>;
}

function StaffContent() {
  const { user, loading } = useAuthStore();
  const router  = useRouter();
  const { incidents, zones, fetchIncidents, fetchZones } = useIncidentStore();
  const connected = useSocketStore(s => s.connected);
  const socket    = useSocketStore(s => s.socket);

  const [ownFilter, setOwnFilter] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'staff' && user.role !== 'admin') { router.push('/login'); }
  }, [loading, user, router]);

  const load = async () => {
    await fetchIncidents({});
    await fetchZones();
  };
  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('incident:new', load);
    socket.on('incident:updated', load);
    return () => { socket.off('incident:new', load); socket.off('incident:updated', load); };
  }, [socket]);

  const mine = ownFilter
    ? incidents.filter(i => i.recommended_responder === user?.name)
    : incidents.filter(i => i.status !== 'resolved');
  const zoneIncidents = selectedZone ? incidents.filter(i => i.zone === selectedZone && i.status !== 'resolved') : [];
  const todayCount = incidents.filter((i) => {
    const created = new Date(i.created_at);
    const now = new Date();
    return created.getFullYear() === now.getFullYear()
      && created.getMonth() === now.getMonth()
      && created.getDate() === now.getDate();
  }).length;
  const activeCount = incidents.filter(i => i.status !== 'resolved').length;
  const resolvedWithDuration = incidents.filter(i => i.resolved_at && i.created_at);
  const avgResolutionMinutes = resolvedWithDuration.length
    ? Math.round(resolvedWithDuration.reduce((acc, i) => {
        return acc + ((new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 60000);
      }, 0) / resolvedWithDuration.length)
    : 0;

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid relative">
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

        <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-72px)]">
          <section className="space-y-4 min-h-0 overflow-y-auto pr-1">
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
              <AnimatePresence>
              <div className="space-y-3">
                {mine.map(inc => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    onClick={() => router.push(`/staff/incident/${inc.id}`)}
                  />
                ))}
              </div>
              </AnimatePresence>
            )}
          </section>

          <section className="min-h-0 flex flex-col gap-3">
            <div className="glass p-3 flex-1 min-h-0">
              <div className="h-full">
                <VenueMap
                  zones={zones}
                  incidents={incidents}
                  onZoneClick={(zone) => setSelectedZone(zone)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/85">
                Today: {todayCount}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/85">
                Active: {activeCount}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/85">
                Avg: {avgResolutionMinutes}m
              </span>
            </div>
          </section>
        </div>

        {selectedZone && (
          <aside
            className="fixed right-0 top-0 h-full w-[320px] z-40 border-l border-white/10 p-4 overflow-y-auto"
            style={{ background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(18px)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{selectedZone}</h3>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-white/70 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {zoneIncidents.length === 0 ? (
              <p className="text-xs text-muted">No active incidents in this zone.</p>
            ) : (
              <AnimatePresence>
              <div className="space-y-3">
                {zoneIncidents.map((inc) => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    onClick={() => router.push(`/staff/incident/${inc.id}`)}
                  />
                ))}
              </div>
              </AnimatePresence>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
