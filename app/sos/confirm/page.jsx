'use client';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const offline = searchParams.get('offline');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl text-center space-y-6">
        <div className="flex justify-center flex-col items-center text-green-500">
          {offline ? <WifiOff className="w-16 h-16 text-yellow-500 mb-4" /> : <CheckCircle className="w-16 h-16 mb-4" /> }
          <h1 className="text-2xl font-bold">{offline ? "Alert Queued" : "Alert Received"}</h1>
        </div>
        
        <p className="text-slate-300">
          {offline 
            ? "You are currently offline. Your emergency alert is queued and will sync automatically when network restores." 
            : "Emergency services have been notified. Stay calm and follow staff instructions."}
        </p>

        <Link href="/" className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all">
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
