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

async function clickWhenReady(selector, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const element = document.querySelector(selector);
    if (element && !element.disabled) {
      element.click();
      return true;
    }
    await wait(200);
  }
  return false;
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
        await wait(3000);
        if (cancelled) return;
        updateRun({ phase: 'incident-page' });
        router.push(`/staff/incident/${current.incidentId}`);
        return;
      }

      if (pathname !== `/staff/incident/${current.incidentId}`) return;

      if (current.phase === 'incident-page') {
        const acknowledged = await clickWhenReady('[data-action="acknowledge"]');
        if (acknowledged) {
          updateRun({ phase: 'acknowledged' });
        }
        return;
      }

      if (current.phase === 'acknowledged') {
        await wait(3000);
        const started = await clickWhenReady('[data-action="start-response"]');
        if (started) {
          updateRun({ phase: 'responding' });
        }
        return;
      }

      if (current.phase === 'responding') {
        await wait(2000);
        await clickWhenReady('[data-tab="tasks"]');
        await wait(400);
        const checked = await clickWhenReady('[data-task-checkbox="primary"]');
        if (checked) {
          updateRun({ phase: 'task-complete' });
        }
        return;
      }

      if (current.phase === 'task-complete') {
        await wait(2000);
        await clickWhenReady('[data-tab="comms"]');
        await wait(400);
        const input = document.querySelector('[data-chat-input="incident"]');
        if (input) {
          setInputValue(input, 'Team on scene situation assessed');
        }
        await wait(400);
        const sent = await clickWhenReady('[data-action="send-chat"]');
        if (sent) {
          updateRun({ phase: 'message-sent' });
        }
        return;
      }

      if (current.phase === 'message-sent') {
        await wait(3000);
        const contained = await clickWhenReady('[data-action="contained"]');
        if (contained) {
          updateRun({ phase: 'contained' });
        }
        return;
      }

      if (current.phase === 'contained') {
        await wait(2000);
        const resolved = await clickWhenReady('[data-action="resolve"]');
        if (resolved) {
          updateRun({ phase: 'resolved' });
        }
        return;
      }

      if (current.phase === 'resolved') {
        await wait(1000);
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
        <p className="text-2xl font-bold text-green-100">
          {'\u2705'} Demo Complete {'\u2014'} CrisisLink resolved the incident in 23 seconds
        </p>
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
