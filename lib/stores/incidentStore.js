'use client';
import { create } from 'zustand';

const useIncidentStore = create((set, get) => ({
  incidents: [],
  activeIncident: null,
  loading: false,
  analytics: null,

  _authHeader: () => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('crisislink_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  fetchIncidents: async (filters = {}) => {
    set({ loading: true });
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.append(k, v));
    const res = await fetch(`/api/incidents?${params}`, { headers: get()._authHeader() });
    const data = await res.json();
    set({ incidents: data.incidents || [], loading: false });
    return data.incidents || [];
  },

  fetchIncident: async (id) => {
    const res = await fetch(`/api/incidents/${id}`, { headers: get()._authHeader() });
    const data = await res.json();
    set({ activeIncident: data });
    return data;
  },

  createIncident: async (body) => {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create incident');
    return data.incident;
  },

  updateStatus: async (id, status) => {
    const res = await fetch(`/api/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    // Optimistic UI update
    set(state => ({
      incidents: state.incidents.map(i => i.id === id ? { ...i, status } : i),
      activeIncident: state.activeIncident?.incident?.id === id
        ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, status } }
        : state.activeIncident,
    }));
    return data.incident;
  },

  addTask: async (incidentId, task) => {
    const res = await fetch(`/api/incidents/${incidentId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
      body: JSON.stringify(task),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    set(state => ({
      activeIncident: state.activeIncident
        ? { ...state.activeIncident, tasks: [...(state.activeIncident.tasks || []), data.task] }
        : state.activeIncident,
    }));
    return data.task;
  },

  toggleTask: async (incidentId, taskId) => {
    const res = await fetch(`/api/incidents/${incidentId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: get()._authHeader(),
    });
    const data = await res.json();
    set(state => ({
      activeIncident: state.activeIncident
        ? {
            ...state.activeIncident,
            tasks: (state.activeIncident.tasks || []).map(t =>
              t.id === taskId ? { ...t, is_complete: data.task.is_complete } : t
            ),
          }
        : state.activeIncident,
    }));
    return data.task;
  },

  sendMessage: async (incidentId, message, senderName) => {
    const res = await fetch(`/api/incidents/${incidentId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
      body: JSON.stringify({ message, sender_name: senderName }),
    });
    return res.json();
  },

  appendIncident: (incident) => {
    set(state => {
      const exists = state.incidents.find(i => i.id === incident.id);
      if (exists) return state;
      return { incidents: [incident, ...state.incidents] };
    });
  },

  updateIncident: (updated) => {
    set(state => ({
      incidents: state.incidents.map(i => i.id === updated.id ? { ...i, ...updated } : i),
      activeIncident: state.activeIncident?.incident?.id === updated.id
        ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, ...updated } }
        : state.activeIncident,
    }));
  },

  fetchAnalytics: async () => {
    const res = await fetch('/api/analytics', { headers: get()._authHeader() });
    const data = await res.json();
    set({ analytics: data });
    return data;
  },
}));

export default useIncidentStore;
