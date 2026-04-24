'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import useAuthStore from '@/lib/stores/authStore';

export default function DemoTriggerPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  const triggerScenario = async () => {
    setRunning(true);
    setSuccess(false);
    try {
      await fetch('/api/simulate', { method: 'POST' });
      setSuccess(true);
    } catch (err) {
      alert("Simulation failed");
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" /> Home
      </Link>
      <div className="glass-panel max-w-lg w-full p-8 rounded-3xl text-center space-y-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
          Simulation Engine
        </h1>
        <p className="text-slate-400">
          Run the deterministic evaluation scenario. This injects a mock kitchen fire, auto-assigns responders, and streams updates over Socket.IO.
        </p>

        <button 
          onClick={triggerScenario}
          disabled={running}
          className="w-full py-4 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/50 disabled:opacity-75"
        >
          {running ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
          {running ? "SCENARIO RUNNING..." : "TRIGGER DEMO SCENARIO"}
        </button>

        {success && (
          <div className="flex items-center justify-center gap-2 text-green-400 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>Scenario executed properly. Watch the Dashboard.</span>
          </div>
        )}
      </div>
    </div>
  );
}
