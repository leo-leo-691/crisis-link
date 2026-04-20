'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import useAuthStore from '@/lib/stores/authStore';
import useUIStore from '@/lib/stores/uiStore';

const ZONES = ['Lobby', 'Restaurant', 'Kitchen', 'Pool Area', 'Gym', 'Spa', 'Bar/Lounge',
  'Conference Room A', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Parking', 'Other'];
const TYPES = ['fire', 'medical', 'security', 'flood', 'evacuation', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function NewIncidentPage() {
  return <AppProviders><NewIncidentForm /></AppProviders>;
}

function NewIncidentForm() {
  const router   = useRouter();
  const user     = useAuthStore(s => s.user);
  const token    = useAuthStore(s => s.token);
  const addToast = useUIStore(s => s.addToast);
  const drillMode = useUIStore(s => s.drillMode);

  const [form, setForm] = useState({
    type: 'fire', zone: 'Lobby', description: '', severity: '',
    room_number: '', reporter_name: user?.name || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { setError('Description is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('crisislink_token')}`,
        },
        body: JSON.stringify({
          ...form,
          reporter_type: 'staff',
          is_drill: drillMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast({ message: `Incident ${data.incident?.id} created`, type: 'success' });
      router.push(`/admin/incidents/${data.incident?.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white text-sm">← Back</button>
          <h1 className="font-bold text-white">New Incident</h1>
          {drillMode && <span className="text-xs px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300">🔵 Drill Mode</span>}
        </div>

        <div className="max-w-2xl mx-auto p-6">
          <form onSubmit={submit} className="space-y-5">
            {/* Type */}
            <div className="glass p-5 space-y-3">
              <label className="text-sm font-semibold text-white">Emergency Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => set('type', t)}
                    className={`py-2 px-3 rounded-lg text-sm capitalize transition-all border ${
                      form.type === t ? 'bg-emergency/20 border-emergency/40 text-white font-semibold' : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="glass p-5 space-y-3">
              <label className="text-sm font-semibold text-white">Location</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Zone *</label>
                  <select className="input-dark" value={form.zone} onChange={e => set('zone', e.target.value)} required>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Room Number</label>
                  <input className="input-dark" placeholder="e.g. 412" value={form.room_number} onChange={e => set('room_number', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="glass p-5 space-y-3">
              <label className="text-sm font-semibold text-white">Incident Details</label>
              <div>
                <label className="text-xs text-muted mb-1 block">Description *</label>
                <textarea
                  className="input-dark h-28 resize-none"
                  placeholder="Describe what is happening, any visible dangers, number of people affected…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Severity Override</label>
                  <select className="input-dark" value={form.severity} onChange={e => set('severity', e.target.value)}>
                    <option value="">Auto (AI Assessed)</option>
                    {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Reporter Name</label>
                  <input className="input-dark" value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                id="btn-submit-incident"
                disabled={loading}
                className="flex-1 py-3.5 bg-emergency hover:bg-red-600 disabled:opacity-60 text-white font-extrabold rounded-xl transition-all hover:shadow-glow-red flex items-center justify-center gap-3"
              >
                {loading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  : '🚨 Create Incident + AI Triage'
                }
              </button>
              <button type="button" onClick={() => router.back()} className="px-6 py-3.5 text-sm text-muted hover:text-white border border-white/10 rounded-xl">
                Cancel
              </button>
            </div>

            <p className="text-xs text-center text-muted">
              AI triage will run automatically and assign severity, dispatch, and evacuation route.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
