'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import VenueMap from '@/components/VenueMap';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';

export default function VenueMapPage() {
  return <AppProviders><MapContent /></AppProviders>;
}

function MapContent() {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const router  = useRouter();
  const { incidents, fetchIncidents } = useIncidentStore();
  const socket = useSocketStore(s => s.socket);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchIncidents({});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('incident:created', () => fetchIncidents({}));
    socket.on('incident:updated', () => fetchIncidents({}));
    return () => {
      socket.off('incident:created');
      socket.off('incident:updated');
    };
  }, [socket]);

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="font-bold text-white">Venue Map</h1>
            <p className="text-xs text-muted">Live incident overlay · {activeIncidents.length} active</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emergency" /> Critical</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> High</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Medium</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-steelblue" /> Low</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="glass p-4">
            <VenueMap incidents={activeIncidents} mode="live" onSelectZone={(zone) => setSelected(zone)} />
          </div>

          {selected && (
            <div className="mt-4 glass p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{selected} — Incidents</h3>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-white text-xs">✕ Close</button>
              </div>
              {activeIncidents.filter(i => i.zone === selected).length === 0
                ? <p className="text-xs text-muted">No active incidents in this zone</p>
                : activeIncidents.filter(i => i.zone === selected).map(inc => (
                  <div
                    key={inc.id}
                    onClick={() => router.push(`/admin/incidents/${inc.id}`)}
                    className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded-lg cursor-pointer"
                  >
                    <span className="text-sm font-mono text-muted">{inc.id}</span>
                    <span className="capitalize text-sm text-white">{inc.type}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      inc.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                    }`}>{inc.severity}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
