'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const STORAGE_KEY = 'crisislink_demo_autopilot';

function readRun() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRun(nextRun) {
  if (typeof window === 'undefined') return;
  if (!nextRun) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextRun));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setInputValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function DemoAutopilot() {
  const pathname = usePathname();
  const router = useRouter();
  const [run, setRun] = useState(null);

  useEffect(() => {
    const syncRun = () => setRun(readRun());
    syncRun();
    const interval = window.setInterval(syncRun, 500);
    return () => window.clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    if (!run?.active || !run.incidentId) return undefined;

    let cancelled = false;

    const updateRun = (nextValues) => {
      const nextRun = { ...readRun(), ...nextValues };
      writeRun(nextRun);
      if (!cancelled) setRun(nextRun);
      return nextRun;
    };

    const completeDemo = () => {
      updateRun({
        active: false,
        phase: 'completed',
        completedAt: Date.now(),
      });
    };

    const perform = async () => {
      const current = readRun();
      if (!current?.active || cancelled) return;

      if (pathname === '/staff/dashboard' && current.phase === 'created') {
        await wait(2500);
        if (cancelled) return;
        updateRun({ phase: 'incident-page' });
        router.push(`/staff/incident/${current.incidentId}`);
        return;
      }

      if (pathname !== `/staff/incident/${current.incidentId}`) return;

      if (current.phase === 'incident-page') {
        await wait(1200);
        document.querySelector('[data-action="acknowledge"]')?.click();
        updateRun({ phase: 'acknowledged' });
        return;
      }

      if (current.phase === 'acknowledged') {
        await wait(1800);
        document.querySelector('[data-action="start-response"]')?.click();
        updateRun({ phase: 'responding' });
        return;
      }

      if (current.phase === 'responding') {
        await wait(1800);
        document.querySelector('[data-tab="tasks"]')?.click();
        await wait(900);
        document.querySelector('[data-task-checkbox="primary"]')?.click();
        updateRun({ phase: 'task-complete' });
        return;
      }

      if (current.phase === 'task-complete') {
        await wait(1800);
        document.querySelector('[data-tab="comms"]')?.click();
        await wait(900);
        const input = document.querySelector('[data-chat-input="incident"]');
        if (input) {
          setInputValue(input, 'Demo autopilot check-in: response team is on scene and patient care has started.');
        }
        await wait(400);
        document.querySelector('[data-action="send-chat"]')?.click();
        updateRun({ phase: 'message-sent' });
        return;
      }

      if (current.phase === 'message-sent') {
        await wait(1800);
        document.querySelector('[data-action="contained"]')?.click();
        updateRun({ phase: 'contained' });
        return;
      }

      if (current.phase === 'contained') {
        await wait(1800);
        document.querySelector('[data-action="resolve"]')?.click();
        updateRun({ phase: 'resolved' });
        return;
      }

      if (current.phase === 'resolved') {
        await wait(1200);
        completeDemo();
      }
    };

    perform();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, run?.active, run?.incidentId, run?.phase]);

  const showOverlay = useMemo(() => run?.phase === 'completed', [run?.phase]);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-green-900/70 flex items-center justify-center p-4">
      <div className="bg-green-900/80 border border-green-400/40 rounded-2xl p-8 text-center max-w-xl w-full">
        <p className="text-2xl font-bold text-green-100">✅ Demo Complete — CrisisLink resolved the incident in 23 seconds</p>
        <button
          onClick={() => {
            writeRun(null);
            setRun(null);
          }}
          className="mt-4 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
