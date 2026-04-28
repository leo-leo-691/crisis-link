'use client';
import { useEffect, useState } from 'react';

export default function BroadcastBanner() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    let tv;
    const handler = (e) => {
      setActive(e.detail);
      if (tv) clearTimeout(tv);
      tv = setTimeout(() => setActive(null), 8000);
    };
    window.addEventListener('crisislink:broadcast', handler);
    return () => {
      window.removeEventListener('crisislink:broadcast', handler);
      if (tv) clearTimeout(tv);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-emergency/95 backdrop-blur-md border-b border-red-500/40 px-4 py-3 flex items-center gap-4 shadow-glow-red slide-in-right">
      <div className="relative flex h-3 w-3 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 pulse-ring" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
      </div>
      <span className="text-white font-semibold text-sm">
        📢 BROADCAST — {active.senderName}: {active.message}
      </span>
      <button
        onClick={() => setActive(null)}
        className="ml-auto text-white/70 hover:text-white transition-colors text-lg leading-none"
      >
        ✕
      </button>
    </div>
  );
}
