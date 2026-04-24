'use client';

import { useEffect, useState } from 'react';

export default function EscalationTimer({ createdAt, status }) {
  const [remaining, setRemaining] = useState(90);

  useEffect(() => {
    if (!createdAt || status !== 'reported') return undefined;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setRemaining(90 - elapsed);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt, status]);

  if (status !== 'reported') {
    return <div className="text-green-400 text-sm">✓ Acknowledged</div>;
  }

  if (remaining <= 0) {
    return <div className="text-red-500 animate-pulse font-bold text-sm">⚠ ESCALATED TO CRITICAL</div>;
  }

  const width = Math.max(0, Math.min(100, (remaining / 90) * 100));
  const barColor = remaining < 30 ? '#E63946' : '#F4A261';

  return (
    <div className="space-y-2">
      <p className="text-sm text-white/85">Response window: {remaining}s</p>
      <div className="w-full h-[6px] rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all origin-left"
          style={{ transform: `scaleX(${width / 100})`, background: barColor }}
        />
      </div>
    </div>
  );
}
