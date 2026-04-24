'use client';
import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,

  login: async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('crisislink_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('crisislink_token');
    set({ user: null, token: null });
  },

  init: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem('crisislink_token');
      if (!token) { set({ loading: false }); return; }
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user || data, token, loading: false });
      } else {
        localStorage.removeItem('crisislink_token');
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },
}));

export default useAuthStore;
