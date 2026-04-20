'use client';
import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  isDarkMode: true,
  isOnline: true,
  drillMode: false,
  soundEnabled: true,
  toasts: [],

  init: () => {
    if (typeof window === 'undefined') return;

    // Dark mode: check localStorage, then system preference
    const stored = localStorage.getItem('crisislink_theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      set({ isDarkMode: false });
    } else if (!stored) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!prefersDark) {
        document.documentElement.classList.remove('dark');
        set({ isDarkMode: false });
      }
    }

    // Online/offline detection
    const handleOnline  = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    set({ isOnline: navigator.onLine });
  },

  toggleDark: () => {
    const next = !get().isDarkMode;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('crisislink_theme', next ? 'dark' : 'light');
    set({ isDarkMode: next });
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
