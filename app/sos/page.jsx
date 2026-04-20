'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import VoiceSOSButton from '@/components/VoiceSOSButton';

const ZONES = ['Lobby', 'Restaurant', 'Kitchen', 'Pool Area', 'Gym', 'Spa', 'Bar/Lounge',
  'Conference Room A', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Parking', 'Other'];

const TYPES = [
  { value: 'fire',       icon: '🔥', label: 'Fire',         color: 'rgba(230,57,70,0.22)',  border: 'rgba(230,57,70,0.55)' },
  { value: 'medical',    icon: '🚑', label: 'Medical',      color: 'rgba(69,123,157,0.22)', border: 'rgba(69,123,157,0.55)' },
  { value: 'security',   icon: '🔐', label: 'Security',     color: 'rgba(244,162,97,0.22)', border: 'rgba(244,162,97,0.55)' },
  { value: 'flood',      icon: '🌊', label: 'Flood/Water',  color: 'rgba(59,130,246,0.22)', border: 'rgba(59,130,246,0.55)' },
  { value: 'evacuation', icon: '🚪', label: 'Evacuation',   color: 'rgba(250,204,21,0.20)', border: 'rgba(250,204,21,0.55)' },
  { value: 'other',      icon: '⚡', label: 'Other',        color: 'rgba(168,85,247,0.20)', border: 'rgba(168,85,247,0.55)' },
];

export default function SOSPage() {
  return (
    <AppProviders>
      <SOSForm />
    </AppProviders>
  );
}

function SOSForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [step, setStep]       = useState(1);
  const [type, setType]       = useState('');
  const [zone, setZone]       = useState('');
  const [desc, setDesc]       = useState('');
  const [name, setName]       = useState('');
  const [room, setRoom]       = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    const z = searchParams.get('zone');
    const r = searchParams.get('room');
    if (z) { setZone(decodeURIComponent(z)); }
    if (r) setRoom(r);
  }, []);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, zone, description: desc, reporter_name: name || 'Anonymous Guest', room_number: room }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.incident);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Type', 'Location', 'Details', 'Confirmed'];
  const progress = ((step - 1) / 3) * 100;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center top, rgba(230,57,70,0.18) 0%, #05070F 55%)',
        backgroundImage: `
          radial-gradient(ellipse at center top, rgba(230,57,70,0.18) 0%, transparent 55%),
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 60px 60px, 60px 60px',
        backgroundColor: '#05070F',
      }}
    >
      {/* Emergency top banner */}
      <div className="scan-overlay flex items-center justify-center gap-3 py-3 px-4"
        style={{ background: 'rgba(230,57,70,0.18)', borderBottom: '1px solid rgba(230,57,70,0.30)' }}>
        <span style={{ color: '#E63946', fontSize: 14 }}>⚑</span>
        <span className="mono font-bold" style={{ fontSize: 12, color: '#FFB3B3', letterSpacing: '0.04em' }}>
          EMERGENCY REPORTING ACTIVE — Help is being dispatched to your location
        </span>
        <span className="w-2 h-2 rounded-full animate-ping-slow ml-1" style={{ background: '#E63946' }} />
      </div>

      {/* Ambient glow orbs */}
      <div className="absolute top-32 right-8 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'rgba(230,57,70,0.06)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-20 left-8 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'rgba(69,123,157,0.05)', filter: 'blur(50px)' }} />

      {/* Back to login */}
      <div className="flex items-center px-6 py-4 relative z-10">
        <button onClick={() => router.push('/')} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>
          ← Back to Login
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[540px] space-y-5 animate-slide-up">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white"
                style={{ background: 'rgba(230,57,70,0.25)', border: '2px solid rgba(230,57,70,0.60)', fontSize: 22, boxShadow: '0 0 40px rgba(230,57,70,0.35)' }}>
                SOS
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(230,57,70,0.12)', animationDuration: '1.5s' }} />
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(230,57,70,0.08)', animationDuration: '2s', animationDelay: '0.5s' }} />
            </div>
            <div>
              <h1 className="font-bold text-white" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>REPORT AN EMERGENCY</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(232,234,240,0.50)' }}>Grand Hotel · Emergency Response System</p>
            </div>
          </div>

          {/* Step progress bar */}
          {step < 4 && (
            <div className="space-y-2">
              <div className="flex justify-between">
                {STEPS.slice(0, 3).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center mono font-bold"
                      style={{
                        fontSize: 10,
                        background: step > i + 1 ? 'rgba(45,198,83,0.25)' : step === i + 1 ? 'rgba(230,57,70,0.30)' : 'rgba(255,255,255,0.07)',
                        border: `1.5px solid ${step > i + 1 ? 'rgba(45,198,83,0.60)' : step === i + 1 ? 'rgba(230,57,70,0.70)' : 'rgba(255,255,255,0.15)'}`,
                        color: step > i + 1 ? '#2DC653' : step === i + 1 ? '#E63946' : 'rgba(232,234,240,0.35)',
                      }}
                    >
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className="mono hidden sm:block" style={{ fontSize: 10, color: step === i + 1 ? 'rgba(232,234,240,0.80)' : 'rgba(232,234,240,0.30)', letterSpacing: '0.06em' }}>
                      {s.toUpperCase()}
                    </span>
                    {i < 2 && <div className="flex-1 ml-2 hidden sm:block" style={{ height: 1, background: 'rgba(255,255,255,0.08)', width: 40 }} />}
                  </div>
                ))}
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #E63946, #FF6B6B)' }} />
              </div>
            </div>
          )}

          {/* Card */}
          <div
            className="glass-strong p-6 space-y-5"
            style={{ border: '1px solid rgba(230,57,70,0.30)', boxShadow: '0 0 40px rgba(230,57,70,0.12), 0 20px 60px rgba(0,0,0,0.5)' }}
          >

            {/* STEP 1 — Emergency Type */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="font-bold text-white" style={{ fontSize: 17 }}>What type of emergency?</h2>
                <div className="grid grid-cols-3 gap-3">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setType(t.value); setStep(2); }}
                      className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl transition-all hover:-translate-y-1 active:scale-95"
                      style={{
                        background: type === t.value ? t.color : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${type === t.value ? t.border : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: type === t.value ? `0 0 20px ${t.color}` : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{t.icon}</span>
                      <span className="mono font-bold" style={{ fontSize: 10, color: 'rgba(232,234,240,0.75)', letterSpacing: '0.04em' }}>
                        {t.label.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2 — Location */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="font-bold text-white" style={{ fontSize: 17 }}>Where is the emergency?</h2>
                <div>
                  <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>AREA / ZONE</label>
                  <div className="relative">
                    <select className="input-glass pr-10" value={zone} onChange={e => setZone(e.target.value)}>
                      <option value="">Select area…</option>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: 16, opacity: 0.5 }}>📍</span>
                  </div>
                </div>
                <div>
                  <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>ROOM NUMBER (OPTIONAL)</label>
                  <input className="input-glass" placeholder="e.g. 412" value={room} onChange={e => setRoom(e.target.value)} />
                </div>
                <button disabled={!zone} onClick={() => setStep(3)} className="btn-primary w-full" style={{ height: 48, opacity: !zone ? 0.45 : 1 }}>
                  Continue →
                </button>
                <button onClick={() => setStep(1)} className="w-full text-center pt-1 transition-colors" style={{ fontSize: 13, color: 'rgba(232,234,240,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back
                </button>
              </div>
            )}

            {/* STEP 3 — Description */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-white" style={{ fontSize: 17 }}>Describe the emergency</h2>
                  <VoiceSOSButton onTranscript={text => setDesc(prev => prev ? `${prev} ${text}` : text)} />
                </div>
                <div>
                  <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>DESCRIPTION</label>
                  <textarea
                    className="input-glass resize-none"
                    style={{ height: 112 }}
                    placeholder="What's happening? Include any details you can see…"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                  <p className="mt-1.5" style={{ fontSize: 11, color: 'rgba(232,234,240,0.28)' }}>
                    💡 Use the microphone button above to speak your description
                  </p>
                </div>
                <div>
                  <label className="mono block mb-1.5" style={{ fontSize: 10, color: 'rgba(232,234,240,0.40)', letterSpacing: '0.08em' }}>YOUR NAME (OPTIONAL)</label>
                  <input className="input-glass" placeholder="So we can reach you" value={name} onChange={e => setName(e.target.value)} />
                </div>
                {error && (
                  <div className="text-sm px-3 py-2 rounded-lg" style={{ color: '#FF6B6B', background: 'rgba(230,57,70,0.12)', border: '0.5px solid rgba(230,57,70,0.30)' }}>
                    {error}
                  </div>
                )}
                <button
                  onClick={submit}
                  disabled={loading || !desc}
                  className="btn-primary w-full"
                  style={{ height: 56, fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', opacity: (!desc || loading) ? 0.5 : 1 }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Dispatching…
                    </>
                  ) : (
                    <>🚨 DISPATCH EMERGENCY RESPONSE</>
                  )}
                </button>
                <button onClick={() => setStep(2)} className="w-full text-center transition-colors" style={{ fontSize: 13, color: 'rgba(232,234,240,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back
                </button>
              </div>
            )}

            {/* STEP 4 — Confirmation */}
            {step === 4 && result && (
              <div className="text-center space-y-5 animate-slide-up py-2">
                <div className="text-5xl animate-bounce">✅</div>
                <div>
                  <h2 className="font-extrabold text-white" style={{ fontSize: 22 }}>Alert Received!</h2>
                  <p className="mt-1" style={{ fontSize: 14, color: 'rgba(232,234,240,0.55)' }}>
                    Our response team has been notified immediately.
                  </p>
                </div>
                <div className="rounded-xl p-4 text-left space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.10)' }}>
                  {[
                    ['Incident ID', <span className="mono">{result.id?.slice(-10)}</span>],
                    ['Zone', result.zone],
                    ['Severity', (
                      <span className={`mono font-bold uppercase text-xs ${result.severity === 'critical' ? 'text-red-400' : result.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>
                        {result.severity}
                      </span>
                    )],
                    ['Status', <span className="mono text-green-400">DISPATCHED</span>],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span style={{ color: 'rgba(232,234,240,0.45)' }}>{label}</span>
                      <span style={{ color: 'rgba(232,234,240,0.90)' }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(45,198,83,0.10)', border: '0.5px solid rgba(45,198,83,0.30)' }}>
                  <p style={{ fontSize: 13, color: '#2DC653' }}>
                    ✓ Emergency services have been coordinated. Stay calm and follow staff instructions.
                  </p>
                </div>
                <button
                  onClick={() => { setStep(1); setResult(null); setType(''); setZone(''); setDesc(''); }}
                  className="btn-ghost w-full"
                >
                  Report Another Emergency
                </button>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="flex items-center justify-center gap-2 pb-4">
            <span style={{ fontSize: 13, opacity: 0.4 }}>🔒</span>
            <p style={{ fontSize: 12, color: 'rgba(232,234,240,0.35)' }}>
              Your precise location is not shared. Only the selected zone is recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
