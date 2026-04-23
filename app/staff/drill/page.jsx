'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';

const SCENARIOS = [
  { icon: '🔥', name: 'Fire on Floor 3', description: 'Smoke reported in guest corridor near east stairwell.', severity: 'critical', type: 'fire', zone: 'Floor 3' },
  { icon: '🩺', name: 'Medical Emergency in Restaurant', description: 'Guest collapse near main dining service area.', severity: 'high', type: 'medical', zone: 'Restaurant' },
  { icon: '🛡️', name: 'Security Threat at Pool', description: 'Aggressive behavior and crowd concern at pool deck.', severity: 'high', type: 'security', zone: 'Pool Deck' },
  { icon: '🌊', name: 'Flood in Basement', description: 'Water ingress detected near utility and laundry rooms.', severity: 'medium', type: 'flood', zone: 'Basement' },
  { icon: '🚪', name: 'Mass Evacuation', description: 'Full venue evacuation drill for all occupied floors.', severity: 'critical', type: 'evacuation', zone: 'All Zones' },
];

export default function StaffDrillPage() {
  return <AppProviders><StaffDrillContent /></AppProviders>;
}

function StaffDrillContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const createIncident = useIncidentStore((s) => s.createIncident);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [launching, setLaunching] = useState(false);
  const [drillIncident, setDrillIncident] = useState(null);
  const [drillStartTime, setDrillStartTime] = useState(null);
  const [drillEndTime, setDrillEndTime] = useState(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'staff' && user.role !== 'admin') { router.push('/login'); }
  }, [user, router]);

  useEffect(() => {
    if (!drillIncident?.id || drillIncident.status === 'resolved') return undefined;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('crisislink_token');
        const res = await fetch(`/api/incidents/${drillIncident.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const payload = await res.json();
        const updatedIncident = payload.incident;
        if (!updatedIncident) return;
        setDrillIncident(updatedIncident);
        if (updatedIncident.status === 'resolved') {
          setDrillEndTime(updatedIncident.resolved_at || new Date().toISOString());
        }
      } catch (error) {
        console.error('[Drill Poll]', error);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [drillIncident?.id, drillIncident?.status]);

  const launchDrill = async () => {
    if (launching || !selectedScenario) return;
    setLaunching(true);
    setDrillEndTime(null);
    try {
      const nowIso = new Date().toISOString();
      const created = await createIncident({
        type: selectedScenario.type,
        zone: selectedScenario.zone,
        description: `[DRILL] ${selectedScenario.name} — ${selectedScenario.description}`,
        reporter_name: user?.name || 'Drill Operator',
        reporter_type: 'staff',
        is_drill: 1,
      });
      setDrillStartTime(nowIso);
      setDrillIncident(created);
    } catch (error) {
      alert(error.message || 'Failed to launch drill');
    } finally {
      setLaunching(false);
    }
  };

  const report = useMemo(() => {
    if (!drillIncident || drillIncident.status !== 'resolved' || !drillStartTime) return null;
    const start = new Date(drillStartTime);
    const end = new Date(drillEndTime || drillIncident.resolved_at || Date.now());
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    return {
      scenario: selectedScenario?.name || drillIncident.type,
      startText: start.toLocaleString(),
      endText: end.toLocaleString(),
      duration: minutes,
    };
  }, [drillIncident, drillStartTime, drillEndTime, selectedScenario?.name]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3">
          <h1 className="font-bold text-white">Emergency Drill Simulator</h1>
          <p className="text-xs text-muted">Run scenario drills and generate completion reports</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SCENARIOS.map((scenario) => {
              const selected = selectedScenario.name === scenario.name;
              return (
                <button
                  key={scenario.name}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`glass p-4 text-left transition-all border ${selected ? 'border-red-500 shadow-glow-red' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{scenario.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-white text-sm">{scenario.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${
                          scenario.severity === 'critical'
                            ? 'bg-red-500/15 border-red-500/30 text-red-300'
                            : scenario.severity === 'high'
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                              : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                        }`}>
                          {scenario.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-2">{scenario.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="glass p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-semibold">Selected: {selectedScenario.name}</p>
              <p className="text-xs text-muted">Drill incidents are tagged with `is_drill = 1`.</p>
            </div>
            <button
              onClick={launchDrill}
              disabled={launching}
              className="px-5 py-2 rounded-lg bg-emergency/90 hover:bg-emergency text-white text-sm font-bold disabled:opacity-50"
            >
              {launching ? 'Launching...' : 'Launch Drill'}
            </button>
          </div>

          {report && (
            <div className="glass p-5 border border-green-500/30">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">Post-Drill Report</h2>
                <span className="px-2.5 py-1 rounded-full text-xs bg-green-500/20 border border-green-500/30 text-green-300">
                  Drill Complete ✓
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <Info label="Scenario" value={report.scenario} />
                <Info label="Start Time" value={report.startText} />
                <Info label="End Time" value={report.endText} />
                <Info label="Total Duration" value={`${report.duration} minutes`} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-[11px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}
