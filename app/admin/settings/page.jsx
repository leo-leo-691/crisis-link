'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import useAuthStore from '@/lib/stores/authStore';
import useUIStore from '@/lib/stores/uiStore';

export default function AdminSettingsPage() {
  return <AppProviders><SettingsContent /></AppProviders>;
}

function SettingsContent() {
  const { user } = useAuthStore();
  const logout  = useAuthStore(s => s.logout);
  const router  = useRouter();
  const drillMode    = useUIStore(s => s.drillMode);
  const toggleDrill  = useUIStore(s => s.toggleDrillMode);
  const addToast     = useUIStore(s => s.addToast);

  const [testingAI, setTestingAI] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [user]);

  const testAI = async () => {
    setTestingAI(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai-test', {
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
      if (res.ok) { addToast({ message: 'Broadcast sent!', type: 'success' }); setBroadcastMsg(''); }
      else addToast({ message: 'Broadcast failed', type: 'error' });
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

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
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
              />
              <button
                onClick={sendBroadcast}
                disabled={sending || !broadcastMsg.trim()}
                className="px-4 py-2 bg-emergency/80 hover:bg-emergency disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all"
              >
                {sending ? '…' : 'Broadcast'}
              </button>
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
