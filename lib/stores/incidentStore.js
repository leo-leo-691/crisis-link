'use client';
import { create } from 'zustand';

const useIncidentStore = create((set, get) => ({
  incidents: [],
  zones: [],
  activeIncident: null,
  loading: false,
  analytics: null,

  fetchZones: async () => {
    const res = await fetch('/api/zones', { headers: get()._authHeader() });
    const data = await res.json();
    set({ zones: data.zones || [] });
    return data.zones || [];
  },


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
    const previousState = get();
    // Optimistic UI update
    set(state => ({
      incidents: state.incidents.map(i => i.id === id ? { ...i, status } : i),
      activeIncident: state.activeIncident?.incident?.id === id
        ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, status } }
        : state.activeIncident,
    }));

    try {
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      return data.incident;
    } catch (error) {
      set({
        incidents: previousState.incidents,
        activeIncident: previousState.activeIncident
      });
      throw error;
    }
  },

  addTask: async (incidentId, task) => {
    const previousState = get();
    const tempId = `temp-${Date.now()}`;
    const tempTask = {
      id: tempId,
      incident_id: incidentId,
      description: task.description,
      title: task.title,
      priority: task.priority,
      is_complete: false,
      created_at: new Date().toISOString()
    };

    set(state => ({
      activeIncident: state.activeIncident
        ? { ...state.activeIncident, tasks: [...(state.activeIncident.tasks || []), tempTask] }
        : state.activeIncident,
    }));

    try {
      const res = await fetch(`/api/incidents/${incidentId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
        body: JSON.stringify(task),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      set(state => ({
        activeIncident: state.activeIncident
          ? {
              ...state.activeIncident,
              tasks: (state.activeIncident.tasks || []).map(t =>
                t.id === tempId ? data.task : t
              ),
            }
          : state.activeIncident,
      }));
      return data.task;
    } catch (error) {
      set({ activeIncident: previousState.activeIncident });
      throw error;
    }
  },

  toggleTask: async (incidentId, taskId) => {
    const previousState = get();
    const taskToToggle = previousState.activeIncident?.tasks?.find(t => t.id === taskId);
    const newIsComplete = taskToToggle ? !taskToToggle.is_complete : true;

    set(state => ({
      activeIncident: state.activeIncident
        ? {
            ...state.activeIncident,
            tasks: (state.activeIncident.tasks || []).map(t =>
              t.id === taskId ? { ...t, is_complete: newIsComplete } : t
            ),
          }
        : state.activeIncident,
    }));

    try {
      const res = await fetch(`/api/incidents/${incidentId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: get()._authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
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
    } catch (error) {
      set({ activeIncident: previousState.activeIncident });
      throw error;
    }
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
    set(state => {
      const exists = state.incidents.find(i => i.id === updated.id);
      const newIncidents = exists 
        ? state.incidents.map(i => i.id === updated.id ? { ...i, ...updated } : i)
        : [updated, ...state.incidents];

      return {
        incidents: newIncidents,
        activeIncident: state.activeIncident?.incident?.id === updated.id
          ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, ...updated } }
          : state.activeIncident,
      };
    });
  },

  fetchAnalytics: async () => {
    const res = await fetch('/api/analytics', { headers: get()._authHeader() });
    const data = await res.json();
    set({ analytics: data });
    return data;
  },
}));

export default useIncidentStore;
