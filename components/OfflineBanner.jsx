'use client';

import { useEffect } from 'react';
import useUIStore from '@/lib/stores/uiStore';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, init } = useUIStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white font-semibold text-center py-2 flex items-center justify-center space-x-2 animate-slide-down">
      <WifiOff className="w-5 h-5" />
      <span>No Internet Connection - Operating in Offline Mode</span>
    </div>
  );
}
