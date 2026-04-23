'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const STEP_LABELS = ['Reported', 'Acknowledged', 'Responding', 'Resolved'];

function getStepIndex(status) {
  if (status === 'resolved') return 3;
  if (status === 'responding' || status === 'contained') return 2;
  if (status === 'acknowledged') return 1;
  return 0;
}

export default function IncidentConfirmPage() {
  const params = useParams();
  const id = String(params?.id || '');

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);

  const fetchIncident = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/incidents/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch incident');
      setIncident(data.incident);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load incident');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const interval = setInterval(fetchIncident, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => setShowAssigned(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  const stepIndex = useMemo(() => getStepIndex(incident?.status), [incident?.status]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  return (
    <main className="min-h-screen bg-[#05070F] text-white flex items-center justify-center p-4">
      <style jsx>{`
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .checkmark-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>

      <section
        className="w-full max-w-2xl rounded-2xl p-8 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(18px)' }}
      >
        <div className="text-center">
          <div className="text-7xl text-green-400 checkmark-scale-in">✓</div>
          <h1 className="text-3xl font-bold mt-3">Alert Received</h1>
          <p className="text-white/60 mt-2">Your emergency report is being actively tracked.</p>
        </div>

        <div className="mt-8 rounded-xl bg-black/35 border border-white/10 p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Incident ID</p>
            <p className="font-mono text-sm text-white break-all">{id}</p>
          </div>
          <button
            onClick={copyId}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
            type="button"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-2">
            {STEP_LABELS.map((label, idx) => {
              const completed = idx < stepIndex;
              const current = idx === stepIndex;
              const future = idx > stepIndex;

              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: completed ? '#2DC653' : current ? '#E63946' : 'transparent',
                        borderColor: completed ? '#2DC653' : current ? '#E63946' : 'rgba(255,255,255,0.30)',
                        color: completed || current ? '#fff' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <p className="text-[11px] mt-2 text-white/70 text-center">{label}</p>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div className="h-[2px] flex-1 -ml-3 -mr-3" style={{ background: 'rgba(255,255,255,0.18)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center mt-7 text-white/75">
          Help is on the way. Stay where you are if safe to do so.
        </p>

        {showAssigned && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/40 text-blue-100 flex items-center justify-center font-bold">
              MR
            </div>
            <div className="flex-1">
              <p className="font-semibold">Marcus Rivera</p>
              <p className="text-xs text-white/60">Assigned Responder</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/35">
              En Route
            </span>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/80 hover:text-white underline underline-offset-4">
            Return to Home
          </Link>
        </div>

        {(loading || error) && (
          <div className="mt-6 text-center text-sm">
            {loading && <p className="text-white/50">Loading incident status...</p>}
            {!!error && <p className="text-red-300">{error}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
