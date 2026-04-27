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
    const zones = Array.isArray(data) ? data : [];
    set({ zones });
    return zones;
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
    const incidents = Array.isArray(data) ? data : (data.incidents || []);
    set({ incidents, loading: false });
    return incidents;
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
      const updatedIncident = data.incident || data;
      set(state => ({
        incidents: state.incidents.map(i => i.id === id ? { ...i, ...updatedIncident } : i),
        activeIncident: state.activeIncident?.incident?.id === id
          ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, ...updatedIncident } }
          : state.activeIncident,
      }));
      return updatedIncident;
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
      const createdTask = data.task || data;
      
      set(state => ({
        activeIncident: state.activeIncident
          ? {
              ...state.activeIncident,
              tasks: (state.activeIncident.tasks || []).map(t =>
                t.id === tempId ? createdTask : t
              ),
            }
          : state.activeIncident,
      }));
      return createdTask;
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
      const updatedTask = data.task || data;
      
      set(state => ({
        activeIncident: state.activeIncident
          ? {
              ...state.activeIncident,
              tasks: (state.activeIncident.tasks || []).map(t =>
                t.id === taskId ? { ...t, is_complete: updatedTask.is_complete } : t
              ),
            }
          : state.activeIncident,
      }));
      return updatedTask;
    } catch (error) {
      set({ activeIncident: previousState.activeIncident });
      throw error;
    }
  },

  assignTask: async (incidentId, taskId) => {
    const previousState = get();
    try {
      const res = await fetch(`/api/incidents/${incidentId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
        body: JSON.stringify({ action: 'assign' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updatedTask = data.task || data;
      
      set(state => ({
        activeIncident: state.activeIncident
          ? {
              ...state.activeIncident,
              tasks: (state.activeIncident.tasks || []).map(t =>
                t.id === taskId ? { ...t, assigned_to: updatedTask.assigned_to } : t
              ),
            }
          : state.activeIncident,
      }));
      return updatedTask;
    } catch (error) {
      throw error;
    }
  },

  sendMessage: async (incidentId, message, senderName) => {
    const res = await fetch(`/api/incidents/${incidentId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...get()._authHeader() },
      body: JSON.stringify({ message, sender_name: senderName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send message');
    return data.message || data;
  },

  addIncident: (incident) => {
    if (!incident?.id) return;
    set(state => {
      const withoutExisting = state.incidents.filter((i) => i?.id && i.id !== incident.id);
      return { incidents: [incident, ...withoutExisting] };
    });
  },

  updateIncident: (incident) => {
    if (!incident?.id) return;
    set(state => {
      const hasMatch = state.incidents.some((i) => i?.id === incident.id);
      const incidents = hasMatch
        ? state.incidents.map((i) => (i?.id === incident.id ? { ...i, ...incident } : i))
        : state.incidents;

      const activeIncident = state.activeIncident?.incident?.id === incident.id
        ? { ...state.activeIncident, incident: { ...state.activeIncident.incident, ...incident } }
        : state.activeIncident;

      return { incidents, activeIncident };
    });
  },

  addMessage: (message) => {
    set(state => {
      if (!state.activeIncident?.incident?.id || state.activeIncident.incident.id !== message.incident_id) {
        return state;
      }
      return {
        activeIncident: {
          ...state.activeIncident,
          messages: [...(state.activeIncident.messages || []), message],
        },
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
