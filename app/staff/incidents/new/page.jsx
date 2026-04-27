'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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
  const { user, loading: authLoading } = useAuthStore();
  const token    = useAuthStore(s => s.token);
  const addToast = useUIStore(s => s.addToast);
  const drillMode = useUIStore(s => s.drillMode);

  const [form, setForm] = useState({
    type: 'fire', zone: 'Lobby', description: '', severity: '',
    room_number: '', reporter_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'staff' && user.role !== 'admin') { router.push('/'); return; }
    if (user) setForm(fp => ({ ...fp, reporter_name: user.name }));
  }, [authLoading, user, router]);

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
      router.push(`/staff/incident/${data.incident?.id}`);
    } catch (err) {
      setError(err.message);
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05070F' }}>
      <Sidebar active="incidents" />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        {/* Header Ribbon */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <p className="mono font-bold" style={{ fontSize: 9, color: 'rgba(230,57,70,0.6)', letterSpacing: '0.2em' }}>BACK TO STREAM</p>
              <h2 className="text-xl font-black text-white">Log Emergency Incident</h2>
            </div>
          </div>
          {drillMode && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="mono font-bold text-purple-300" style={{ fontSize: 10 }}>DRILL MODE ACTIVE</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 bg-grid">
          <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Classification */}
              <div className="space-y-6">
                <div className="glass p-6 space-y-4">
                  <div>
                    <h3 className="mono font-bold text-white mb-4" style={{ fontSize: 11, letterSpacing: '0.05em' }}>— EMERGENCY CLASSIFICATION</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {TYPES.map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => set('type', t)}
                          className={`py-2.5 px-3 rounded-xl text-sm capitalize transition-all border ${
                            form.type === t 
                              ? 'bg-red-500/20 border-red-500/50 text-white font-bold glow-red-sm' 
                              : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <label className="block text-xs font-bold text-white/50 mb-2 mono">SEVERITY OVERRIDE (OPTIONAL)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SEVERITIES.map(s => (
                        <button
                          key={s} type="button"
                          onClick={() => set('severity', form.severity === s ? '' : s)}
                          className={`py-2 px-3 rounded-lg text-xs capitalize transition-all border ${
                            form.severity === s 
                              ? 'bg-white/10 border-white/30 text-white font-bold' 
                              : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {form.severity === '' && (
                      <p className="mt-2 mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>AI will assess severity if left blank</p>
                    )}
                  </div>
                </div>

                <div className="glass p-6">
                  <h3 className="mono font-bold text-white mb-4" style={{ fontSize: 11, letterSpacing: '0.05em' }}>— REPORTER INFO</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-white/50 mb-1.5 mono">REPORTER NAME</label>
                      <input 
                        className="input-dark w-full opacity-60 cursor-not-allowed" 
                        placeholder="Staff Name"
                        value={form.reporter_name} 
                        readOnly
                        title="Reporter name is automatically securely tied to your login ID"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 mb-1.5 mono">ROOM / UNIT (IF APPLICABLE)</label>
                      <input 
                        className="input-dark w-full" 
                        placeholder="e.g. 412 or Penthouse"
                        value={form.room_number} 
                        onChange={e => set('room_number', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Location & Details */}
              <div className="space-y-6">
                <div className="glass p-6">
                  <h3 className="mono font-bold text-white mb-4" style={{ fontSize: 11, letterSpacing: '0.05em' }}>— INCIDENT LOCATION</h3>
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-2 mono">VENUE ZONE *</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {ZONES.map(z => (
                        <button
                          key={z} type="button"
                          onClick={() => set('zone', z)}
                          className={`py-2 px-3 rounded-lg text-xs transition-all border text-left ${
                            form.zone === z 
                              ? 'bg-white/10 border-white/30 text-white font-bold' 
                              : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass p-6 flex-1 flex flex-col">
                  <h3 className="mono font-bold text-white mb-4" style={{ fontSize: 11, letterSpacing: '0.05em' }}>— SITUATIONAL DESCRIPTION</h3>
                  <div className="flex-1 flex flex-col space-y-2">
                    <textarea
                      className="input-dark w-full flex-1 min-h-[180px] resize-none"
                      placeholder="Identify specific threat, number of casualties, exact location details, and immediate actions already taken..."
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      required
                    />
                    <div className="flex items-center justify-between px-1">
                       <span className="mono text-[9px] text-white/20">DETAILED INTEL ASSISTS AI TRIAGE</span>
                       <span className={`mono text-[9px] ${form.description.length < 20 ? 'text-yellow-500/50' : 'text-green-500/50'}`}>
                         {form.description.length} CHARS
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="pt-4 flex flex-col md:flex-row gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3"
                style={{ fontSize: 16 }}
              >
                {loading
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> DISPATCHING...</>
                  : '🚨 BROADCAST INCIDENT & INITIALIZE AI'
                }
              </button>
              <button 
                type="button" 
                onClick={() => router.back()} 
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/70 font-bold rounded-2xl border border-white/10 transition-all"
              >
                DISCARD
              </button>
            </div>

            <p className="text-center mono text-[10px] text-white/20 uppercase letter-spacing-widest">
              By submitting, you initiate the protocol cascade for '{form.type.toUpperCase()}' emergencies.
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}
