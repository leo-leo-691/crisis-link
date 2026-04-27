'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import useAuthStore from '@/lib/stores/authStore';
import useUIStore from '@/lib/stores/uiStore';
import useIncidentStore from '@/lib/stores/incidentStore';

export default function AdminSettingsPage() {
  return <AppProviders><SettingsContent /></AppProviders>;
}

function SettingsContent() {
  const { user, loading } = useAuthStore();
  const logout  = useAuthStore(s => s.logout);
  const router  = useRouter();
  const drillMode    = useUIStore(s => s.drillMode);
  const toggleDrill  = useUIStore(s => s.toggleDrillMode);
  const addToast     = useUIStore(s => s.addToast);
  const soundEnabled = useUIStore(s => s.soundEnabled);
  const toggleSound  = useUIStore(s => s.toggleSound);

  const [testingAI, setTestingAI] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sending, setSending]     = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [venueName, setVenueName] = useState('Grand Hotel & Resort');
  const [venueAddress, setVenueAddress] = useState('123 Ocean Drive');
  const [escalationTimeout, setEscalationTimeout] = useState(90);
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState('');
  const [notifPermission, setNotifPermission] = useState('default');
  const fetchZonesStore = useIncidentStore(s => s.fetchZones);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const loadZones = async () => {
      try {
        const res = await fetch('/api/zones', {
          headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
        });
        const payload = await res.json();
        if (res.ok) setZones(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error('[Settings] zone load error', error);
      }
    };
    loadZones();
  }, []);

  const fetchBroadcastHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/broadcast', {
        headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
      });
      const payload = await res.json();
      if (res.ok) setBroadcastHistory(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('[Settings] broadcast history error', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchBroadcastHistory();
  }, []);

  const testAI = async () => {
    setTestingAI(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/health', {
        headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
      });
      const d = await res.json();
      setAiResult(d);
    } catch (e) {
      setAiResult({ error: e.message });
    } finally { setTestingAI(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
        body: JSON.stringify({ message: broadcastMsg }),
      });
      if (res.ok) {
        addToast({ message: 'Broadcast sent!', type: 'success' });
        setBroadcastMsg('');
        fetchBroadcastHistory(); // refresh history
      } else {
        addToast({ message: 'Broadcast failed', type: 'error' });
      }
    } catch { addToast({ message: 'Broadcast failed', type: 'error' }); }
    finally { setSending(false); }
  };

  const seedDb = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` } });
      if (res.ok) addToast({ message: 'Database re-seeded!', type: 'success' });
      else addToast({ message: 'Seed failed', type: 'error' });
    } catch { addToast({ message: 'Seed failed', type: 'error' }); }
  };

  const saveVenueInfo = () => {
    addToast({ message: 'Venue info saved locally', type: 'success' });
  };

  const saveEscalationTimeout = () => {
    addToast({ message: `Escalation timeout set to ${escalationTimeout} minutes`, type: 'success' });
  };

  const wipeData = async () => {
    if (!window.confirm('CRITICAL: This will permanently delete ALL incidents, tasks, and messages. This cannot be undone. Proceed?')) return;
    
    try {
      const res = await fetch('/api/admin/wipe', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` } 
      });
      if (res.ok) {
        addToast({ message: 'All incident data wiped!', type: 'success' });
      } else {
        const d = await res.json();
        addToast({ message: d.error || 'Wipe failed', type: 'error' });
      }
    } catch {
      addToast({ message: 'System error during wipe', type: 'error' });
    }
  };

  const addZone = async () => {
    if (!newZone.trim()) return;
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('crisislink_token')}`,
        },
        body: JSON.stringify({ name: newZone.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add zone');
      setZones((prev) => [...prev, payload.zone]);
      fetchZonesStore(); // Sync the global store so VenueMap reflects the change
      setNewZone('');
      addToast({ message: 'Zone added — visible on Venue Map', type: 'success' });
    } catch (error) {
      addToast({ message: error.message || 'Failed to add zone', type: 'error' });
    }
  };

  const deleteZone = async (zoneId) => {
    try {
      const res = await fetch(`/api/zones?id=${zoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('crisislink_token')}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to delete zone');
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      fetchZonesStore(); // Keep global store in sync
      addToast({ message: 'Zone removed', type: 'success' });
    } catch (error) {
      addToast({ message: error.message || 'Failed to delete zone', type: 'error' });
    }
  };

  const requestBrowserNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addToast({ message: 'Browser notifications unsupported', type: 'error' });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    addToast({
      message: permission === 'granted' ? 'Notifications enabled' : 'Notifications not granted',
      type: permission === 'granted' ? 'success' : 'error',
    });
  };

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid min-w-0">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3">
          <h1 className="font-bold text-white">Settings</h1>
          <p className="text-xs text-muted">System configuration and admin tools</p>
        </div>
        <div className="max-w-2xl mx-auto p-6 space-y-5">

          {/* Profile */}
          <Section title="Profile">
            <InfoRow label="Name"       value={user?.name} />
            <InfoRow label="Email"      value={user?.email} />
            <InfoRow label="Role"       value={user?.role} />
            <InfoRow label="Department" value={user?.department} />
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="mt-2 px-4 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </Section>

          <Section title="Venue Info">
            <input className="input-dark w-full text-sm" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Venue Name" />
            <input className="input-dark w-full text-sm" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="Address" />
            <button onClick={saveVenueInfo} className="px-4 py-2 bg-steelblue/30 hover:bg-steelblue/50 border border-steelblue/40 text-white text-sm rounded-lg">
              Save
            </button>
          </Section>

          <Section title="Escalation Timeout">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                className="input-dark w-40 text-sm"
                value={escalationTimeout}
                onChange={(e) => setEscalationTimeout(Number(e.target.value) || 90)}
              />
              <span className="text-xs text-muted">minutes</span>
            </div>
            <button onClick={saveEscalationTimeout} className="px-4 py-2 bg-steelblue/30 hover:bg-steelblue/50 border border-steelblue/40 text-white text-sm rounded-lg">
              Save
            </button>
          </Section>

          <Section title="Zone Management">
            <div className="space-y-2">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-sm text-white">{zone.name}</span>
                  <button
                    onClick={() => deleteZone(zone.id)}
                    className="px-2 py-1 text-xs rounded bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-dark flex-1 text-sm"
                placeholder="Add new zone"
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
              />
              <button onClick={addZone} className="px-4 py-2 bg-emergency/80 hover:bg-emergency text-white text-sm font-semibold rounded-lg">
                Add Zone
              </button>
            </div>
          </Section>

          <Section title="Notifications">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifPermission === 'granted'}
                onChange={requestBrowserNotification}
                className="accent-steelblue"
              />
              <span className="text-sm text-white">
                Browser notifications {notifPermission === 'granted' ? 'enabled' : 'disabled'}
              </span>
            </label>
          </Section>

          <Section title="Sound">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={soundEnabled} onChange={toggleSound} className="accent-steelblue" />
              <span className="text-sm text-white">{soundEnabled ? 'Alert sounds enabled' : 'Alert sounds muted'}</span>
            </label>
          </Section>

          {/* Drill mode */}
          <Section title="Drill Mode">
            <p className="text-xs text-muted mb-3">When enabled, all new incidents are marked as drills and won't trigger real alerts.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={toggleDrill}
                className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${drillMode ? 'bg-purple-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${drillMode ? 'translate-x-6' : ''}`} />
              </div>
              <span className="text-sm text-white">{drillMode ? '🔵 Drill Mode Active' : 'Drill Mode Off'}</span>
            </label>
          </Section>

          {/* System broadcast */}
          <Section title="System Broadcast">
            <p className="text-xs text-muted mb-3">Send a live alert to all connected staff browsers.</p>
            <div className="flex gap-2">
              <input
                className="input-dark flex-1 text-sm"
                placeholder="e.g. Please evacuate the south wing"
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendBroadcast()}
              />
              <button
                onClick={sendBroadcast}
                disabled={sending || !broadcastMsg.trim()}
                className="px-4 py-2 bg-emergency/80 hover:bg-emergency disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all"
              >
                {sending ? '…' : 'Broadcast'}
              </button>
            </div>

            {/* Broadcast history */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide">Recent Broadcasts</p>
                <button
                  onClick={fetchBroadcastHistory}
                  disabled={loadingHistory}
                  className="text-[10px] text-muted hover:text-white transition-colors"
                >
                  {loadingHistory ? 'Loading…' : '↻ Refresh'}
                </button>
              </div>
              {broadcastHistory.length === 0 ? (
                <p className="text-xs text-muted italic py-2">{loadingHistory ? 'Loading history…' : 'No broadcasts sent yet.'}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {broadcastHistory.map((b) => (
                    <div key={b.id} className="rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white/85 leading-snug">{b.message}</p>
                        <span className="flex-shrink-0 text-[9px] mono px-1.5 py-0.5 rounded bg-white/8 text-muted capitalize">
                          {b.target_role}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mt-1">
                        {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* AI health */}
          <Section title="AI System Health">
            <p className="text-xs text-muted mb-3">Run a quick sanity check on the AI triage engine.</p>
            <button
              onClick={testAI}
              disabled={testingAI}
              className="px-4 py-2 bg-steelblue/30 hover:bg-steelblue/50 border border-steelblue/30 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-all"
            >
              {testingAI ? '⏳ Testing…' : '🤖 Test AI Engine'}
            </button>
            {aiResult && (
              <pre className="mt-3 text-xs font-mono text-white/70 bg-black/30 rounded-lg p-3 overflow-auto max-h-48">
                {JSON.stringify(aiResult, null, 2)}
              </pre>
            )}
          </Section>

          {/* Demo tools */}
          <Section title="Demo Tools">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={seedDb}
                className="px-4 py-2 bg-white/8 hover:bg-white/14 border border-white/10 text-muted hover:text-white text-sm rounded-lg transition-all"
              >
                🔄 Re-seed Database
              </button>
              <button
                onClick={() => router.push('/qr')}
                className="px-4 py-2 bg-white/8 hover:bg-white/14 border border-white/10 text-muted hover:text-white text-sm rounded-lg transition-all"
              >
                📱 QR Codes
              </button>
              <button
                onClick={() => router.push('/sos')}
                className="px-4 py-2 bg-white/8 hover:bg-white/14 border border-white/10 text-muted hover:text-white text-sm rounded-lg transition-all"
              >
                🆘 Test SOS Page
              </button>
              <button
                onClick={wipeData}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold rounded-lg transition-all"
              >
                ⚠️ Wipe All Incidents
              </button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="glass p-5 space-y-3">
      <h2 className="text-sm font-semibold text-white border-b border-white/8 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-white capitalize">{value}</span>
    </div>
  );
}
