'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CriticalAlertBanner() {
  const [active, setActive] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e) => {
      setActive(e.detail);
    };
    window.addEventListener('crisislink:critical_alert', handler);
    return () => window.removeEventListener('crisislink:critical_alert', handler);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-start pt-16">
      {/* Full screen flashing border */}
      <div className="absolute inset-0 border-[8px] border-red-600/80 animate-pulse pointer-events-none" style={{ boxShadow: 'inset 0 0 100px rgba(220,38,38,0.5)' }} />
      
      {/* Clickable banner */}
      <div className="pointer-events-auto bg-red-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-6 animate-bounce" style={{ border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(220,38,38,0.4), 0 0 0 4px rgba(220,38,38,0.2)' }}>
        <div className="text-4xl animate-pulse">🚨</div>
        <div>
          <h2 className="font-black text-xl tracking-wide uppercase">Critical Incident Detected</h2>
          <p className="text-red-100 font-medium text-sm mt-1">{active.zone} — {active.type?.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button
            onClick={() => {
              setActive(null);
              router.push(`/admin/incidents/${active.id}`);
            }}
            className="bg-white text-red-600 font-bold px-6 py-2 rounded-xl hover:bg-red-50 transition-colors shadow-lg"
          >
            RESPOND
          </button>
          <button
            onClick={() => setActive(null)}
            className="bg-red-700 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
