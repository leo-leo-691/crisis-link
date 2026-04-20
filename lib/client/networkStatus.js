'use client';

import { useEffect } from 'zustand';
import { create } from 'zustand';

export const useNetworkStatus = create((set) => ({
  status: 'online', // 'online', 'degraded', 'offline'
  latency: 0,
  setStatus: (s) => set({ status: s }),
  setLatency: (l) => set({ latency: l })
}));

export function NetworkManager({ socket }) {
  const setStatus = useNetworkStatus(state => state.setStatus);
  const setLatency = useNetworkStatus(state => state.setLatency);

  // Monitor socket and pure web navigator connection
  // useEffect is expected to be wrapped properly when this is mounted in layout.

  return null; // Logic wrapper component
}
