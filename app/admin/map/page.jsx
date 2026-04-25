'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import VenueMap from '@/components/VenueMap';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';

export default function VenueMapPage() {
  return <AppProviders><MapContent /></AppProviders>;
}

function MapContent() {
  const { user, loading } = useAuthStore();
  const router  = useRouter();
  const { incidents, zones, fetchIncidents, fetchZones } = useIncidentStore();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  const load = useCallback(async () => {
    await fetchIncidents({});
    await fetchZones();
  }, [fetchIncidents, fetchZones]);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid relative">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-4 flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Venue Intelligence Map</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-muted font-medium uppercase tracking-wider">Live Operation Overlay · {activeIncidents.length} active</p>
            </div>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emergency/40 border border-emergency shadow-[0_0_8px_rgba(230,57,70,0.5)]" /> Critical</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-orange-400/30 border border-orange-400 shadow-[0_0_8px_rgba(244,162,97,0.4)]" /> High</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-yellow-400/30 border border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]" /> Medium</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-steelblue/30 border border-steelblue" /> Low</span>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1400px] mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-steelblue/10 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-50 transition" />
            <div className="relative glass p-2 rounded-2xl border border-white/5 shadow-2xl">
              <VenueMap 
                zones={zones} 
                incidents={activeIncidents} 
                mode="live" 
                onZoneClick={(zone) => setSelected(zone)} 
              />
            </div>
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
