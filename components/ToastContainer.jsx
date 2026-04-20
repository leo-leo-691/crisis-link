'use client';
import { useEffect, useState } from 'react';
import useUIStore from '@/lib/stores/uiStore';

export default function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
            text-white text-sm font-medium shadow-2xl cursor-pointer
            slide-in-right max-w-sm
            ${t.type === 'error'   ? 'bg-emergency border border-red-500/30' : ''}
            ${t.type === 'success' ? 'bg-emerald-600/90 border border-emerald-400/30' : ''}
            ${t.type === 'warning' ? 'bg-amber-600/90 border border-amber-400/30' : ''}
            ${!t.type || t.type === 'info' ? 'bg-steelblue/90 border border-blue-400/30' : ''}
            backdrop-blur-md
          `}
        >
          <span>
            {t.type === 'error'   && '❌ '}
            {t.type === 'success' && '✅ '}
            {t.type === 'warning' && '⚠️ '}
            {(!t.type || t.type === 'info') && 'ℹ️ '}
            {t.message}
          </span>
          <button className="ml-auto opacity-70 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}
