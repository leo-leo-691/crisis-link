'use client';
import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  isOnline: true,
  drillMode: false,
  soundEnabled: true,
  toasts: [],

  init: () => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.add('dark');

    const handleOnline  = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    set({ isOnline: navigator.onLine });
  },

  setOnline: (v) => set({ isOnline: v }),
  toggleDrillMode: () => set(state => ({ drillMode: !state.drillMode })),
  toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),

  addToast: (toast) => {
    const id = Date.now();
    set(state => ({ toasts: [...state.toasts, { id, ...toast }] }));
    setTimeout(() => get().removeToast(id), toast.duration || 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

export default useUIStore;
