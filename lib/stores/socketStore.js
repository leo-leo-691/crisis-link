'use client';
import { create } from 'zustand';
import useIncidentStore from './incidentStore';

// ── Web Audio helpers ────────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, gain = 0.3, type = 'sine') {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* silent */ }
}

function playAlertSound(severity) {
  if (typeof window === 'undefined') return;
  try {
    switch (severity) {
      case 'low':
        // Calm 2-tone
        playTone(440, 0.3, 0.2); 
        setTimeout(() => playTone(550, 0.3, 0.2), 350);
        break;
      case 'medium':
        // Double beep
        playTone(660, 0.2, 0.25);
        setTimeout(() => playTone(660, 0.2, 0.25), 250);
        break;
      case 'high':
        // Urgent 3-tone pulse
        playTone(880, 0.2, 0.3); 
        setTimeout(() => playTone(880, 0.2, 0.3), 250);
        setTimeout(() => playTone(880, 0.2, 0.3), 500);
        break;
      case 'critical':
        // Alarm-style alternating
        for (let i = 0; i < 6; i++) {
          setTimeout(() => playTone(i % 2 === 0 ? 1047 : 880, 0.2, 0.4, 'sawtooth'), i * 220);
        }
        break;
      default:
        playTone(440, 0.4, 0.2);
    }
  } catch (e) { /* silent */ }
}

// ── Browser Notifications ────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function fireNotification(incident) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`🚨 CrisisLink Alert`, {
      body: `${incident.type?.toUpperCase()} in ${incident.zone} — ${incident.severity?.toUpperCase()}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: incident.id,
      requireInteraction: incident.severity === 'critical',
    });
  }
}

// ── Store ────────────────────────────────────────────────────────────────────
const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  isReconnecting: false,
  liveCount: 0,
  broadcasts: [],

  initSocket: (token) => {
    if (typeof window === 'undefined') return;
    if (get().socket) return; // guard against double-init

    // Dynamically import socket.io-client
    import('socket.io-client').then(({ io }) => {
      const socket = io(window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        set({ connected: true, isReconnecting: false });
        console.log('[WS] Connected');
      });

      socket.io.on('reconnect_attempt', () => {
        set({ isReconnecting: true, connected: false });
        console.log('[WS] Attempting to reconnect...');
      });

      let lastSyncTime = 0;

      socket.io.on('reconnect', () => {
        console.log('[WS] Successfully reconnected.');
        set({ connected: true, isReconnecting: false });
        
        const now = Date.now();
        if (now - lastSyncTime < 10000) {
          console.log('[WS] Skipping sync (debounced)');
          return;
        }
        lastSyncTime = now;
        
        console.log('[WS] Resyncing state...');
        import('./incidentStore').then(m => {
          const store = m.default.getState();
          // Re-sync all incidents to prevent state loss
          store.fetchIncidents({});
          if (store.activeIncident?.incident?.id) {
            // Re-sync active incident
            store.fetchIncident(store.activeIncident.incident.id);
          }
        });
      });

      socket.on('disconnect', (reason) => {
        set({ connected: false, isReconnecting: reason !== 'io client disconnect' });
        console.log('[WS] Disconnected:', reason);
      });

      socket.on('incident:new', (incident) => {
        useIncidentStore.getState().addIncident(incident);
        if (get().soundEnabled !== false) {
          playAlertSound(incident.severity);
        }
        fireNotification(incident);
        if (incident?.severity === 'critical' && !incident?.is_drill && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crisislink:critical_alert', { detail: incident }));
        }
        set(state => ({ liveCount: state.liveCount + 1 }));
      });

      socket.on('incident:updated', (incident) => {
        useIncidentStore.getState().updateIncident(incident);
      });

      socket.on('incident:message', (message) => {
        useIncidentStore.getState().addMessage(message);
      });

      socket.on('incident:task', ({ incidentId, task }) => {
        import('./incidentStore').then(m => {
          const store = m.default.getState();
          if (store.activeIncident?.incident?.id === incidentId) {
            m.default.setState(state => ({
              activeIncident: state.activeIncident ? {
                ...state.activeIncident,
                tasks: (state.activeIncident.tasks || []).map(t =>
                  t.id === task.id ? task : t
                ).concat((state.activeIncident.tasks || []).find(t => t.id === task.id) ? [] : [task]),
              } : state.activeIncident,
            }));
          }
        });
      });

      socket.on('broadcast', (data) => {
        // show toast notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crisislink:broadcast', { detail: data }));
        }
        set(state => ({ broadcasts: [{ ...data, timestamp: new Date().toISOString() }, ...state.broadcasts].slice(0, 50) }));
      });

      socket.on('live_count', ({ count }) => {
        set({ liveCount: count });
      });

      set({ socket });
    }).catch(err => console.error('[WS] Failed to load socket.io-client:', err));
  },

  joinIncident: (id) => {
    const { socket } = get();
    if (socket) socket.emit('join:incident', id);
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, isReconnecting: false });
    }
  },

  requestNotifications: requestNotificationPermission,
  playAlertSound,
  soundEnabled: true,
  toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
}));

export default useSocketStore;
