'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import VenueMap from '@/components/VenueMap';
import IncidentCard from '@/components/IncidentCard';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import { AnimatePresence } from 'framer-motion';

export default function StaffMapPage() {
  return <AppProviders><StaffMapContent /></AppProviders>;
}

function StaffMapContent() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { incidents, zones, fetchIncidents, fetchZones } = useIncidentStore();
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'staff' && user.role !== 'admin') {
      router.push('/');
    }
  }, [loading, user, router]);

  const load = useCallback(async () => {
    await fetchIncidents({});
    await fetchZones();
  }, [fetchIncidents, fetchZones]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved');
  const zoneIncidents = selectedZone
    ? activeIncidents.filter((incident) => incident.zone === selectedZone)
    : [];

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid relative">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 pl-14 lg:pl-6 pr-6 py-4 flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Staff Venue Map</h1>
            <p className="text-xs text-muted mt-1">Live floor plan with active incident overlays</p>
          </div>
          <div className="ml-auto flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emergency/40 border border-emergency" /> Critical</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-orange-400/30 border border-orange-400" /> High</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-yellow-400/30 border border-yellow-400" /> Medium</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-steelblue/30 border border-steelblue" /> Low</span>
          </div>
        </div>

        <div className="p-8 max-w-[1400px] mx-auto space-y-4">
          <div className="glass p-3 rounded-2xl border border-white/5 shadow-2xl">
            <div className="h-[680px]">
              <VenueMap
                zones={zones}
                incidents={activeIncidents}
                onZoneClick={(zone) => setSelectedZone(zone)}
              />
            </div>
          </div>

          {selectedZone && (
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{selectedZone} - Active Incidents</h3>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="text-muted hover:text-white text-xs"
                >
                  Close
                </button>
              </div>
              {zoneIncidents.length === 0 ? (
                <p className="text-xs text-muted">No active incidents in this zone.</p>
              ) : (
                <AnimatePresence>
                  <div className="space-y-3">
                    {zoneIncidents.map((incident) => (
                      <IncidentCard
                        key={incident.id}
                        incident={incident}
                        onClick={() => router.push(`/staff/incident/${incident.id}`)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
