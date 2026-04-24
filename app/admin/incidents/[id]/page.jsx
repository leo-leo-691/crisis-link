'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge, TypeIcon } from '@/components/IncidentCard';
import CrisisBot from '@/components/CrisisBot';
import DebriefModal from '@/components/DebriefModal';
import AITriagePanel from '@/components/AITriagePanel';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';
import useUIStore from '@/lib/stores/uiStore';

const STATUS_ORDER = ['reported', 'acknowledged', 'responding', 'contained', 'resolved'];

export default function IncidentDetailPage() {
  return <AppProviders><IncidentDetail /></AppProviders>;
}

function IncidentDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const token  = useAuthStore(s => s.token);
  const { fetchIncident, updateStatus, toggleTask, sendMessage } = useIncidentStore();
  const joinIncident = useSocketStore(s => s.joinIncident);
  const addToast     = useUIStore(s => s.addToast);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const data = useIncidentStore(s => s.activeIncident);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [debrief, setDebrief]     = useState(null);
  const [followup, setFollowup]   = useState(null);
  const [loadingAI, setLoadingAI] = useState('');
  const [chatMsg, setChatMsg]     = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [togglingTasks, setTogglingTasks] = useState({});
  const [users, setUsers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskAssignee, setTaskAssignee] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  const load = async () => {
    await fetchIncident(id);
    setLoadingInitial(false);
  };

  useEffect(() => {
    if (id) {
      load();
      joinIncident(id);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'tasks' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, users.length]);

  // Realtime updates are handled globally via socketStore.js

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(newStatus);
      await updateStatus(id, newStatus);
      addToast({ message: `Status → ${newStatus}`, type: 'success' });
    } catch (e) { addToast({ message: e.message, type: 'error' }); }
    finally { setUpdatingStatus(null); }
  };

  const handleToggleTask = async (taskId) => {
    try {
      setTogglingTasks(prev => ({ ...prev, [taskId]: true }));
      await toggleTask(id, taskId);
    } catch (e) { addToast({ message: e.message, type: 'error' }); }
    finally { setTogglingTasks(prev => ({ ...prev, [taskId]: false })); }
  };

  const generateDebrief = async () => {
    setLoadingAI('debrief');
    try {
      const res = await fetch(`/api/incidents/${id}/debrief`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error || 'Debrief generation failed');
      if (typeof d.report !== 'string' || !d.report) throw new Error('Empty debrief response');
      setDebrief(d.report);
    } catch (e) { addToast({ message: e.message || 'Debrief generation failed', type: 'error' }); }
    finally { setLoadingAI(''); }
  };

  const generateFollowup = async () => {
    setLoadingAI('followup');
    try {
      const res = await fetch(`/api/incidents/${id}/followup`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setFollowup(d.message);
    } catch (e) { addToast({ message: 'Follow-up generation failed', type: 'error' }); }
    finally { setLoadingAI(''); }
  };

  const sendChat = async () => {
    if (!chatMsg.trim() || chatSending) return;
    setChatSending(true);
    try {
      await sendMessage(id, chatMsg, user?.name || 'Staff');
      setChatMsg('');
      load();
    } catch (e) { addToast({ message: e.message, type: 'error' }); }
    finally { setChatSending(false); }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load users');
      setUsers(Array.isArray(payload) ? payload : []);
    } catch (e) {
      addToast({ message: e.message || 'Failed to load users', type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const openTaskModal = async () => {
    setShowTaskModal(true);
    await fetchUsers();
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskTitle('');
    setTaskPriority('medium');
    setTaskAssignee('');
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      const res = await fetch(`/api/incidents/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: taskTitle.trim(),
          assigned_to: taskAssignee ? Number(taskAssignee) : null,
          priority: taskPriority,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add task');
      closeTaskModal();
      await load();
      addToast({ message: 'Task added', type: 'success' });
    } catch (e) {
      addToast({ message: e.message || 'Failed to add task', type: 'error' });
    } finally {
      setCreatingTask(false);
    }
  };

  if (!data || !data.incident) return (
    <div className="flex h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-center text-muted gap-4">
        {loadingInitial ? (
          <div className="skeleton w-12 h-12 rounded-full" />
        ) : (
          <>
            <p className="text-xl">⚠️ Incident Not Found</p>
            <p className="text-sm opacity-60">The requested incident ID does not exist or was deleted.</p>
            <button onClick={() => router.push('/admin/dashboard')} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white">Return to Dashboard</button>
          </>
        )}
      </main>
    </div>
  );

  const { incident, tasks = [], messages = [], timeline = [] } = data;
  const triage = typeof incident.ai_triage === 'string' ? JSON.parse(incident.ai_triage || 'null') : incident.ai_triage;
  const currentStatusIdx = STATUS_ORDER.indexOf(incident.status);
  const usersById = users.reduce((acc, person) => {
    acc[String(person.id)] = person;
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted hover:text-white text-sm transition-colors">← Back</button>
          <div className="flex items-center gap-3">
            <TypeIcon type={incident.type} />
            <div>
              <h1 className="font-bold text-white text-base">{incident.id}</h1>
              <p className="text-xs text-muted">{incident.zone} · {incident.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Status pipeline */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1">
            {STATUS_ORDER.map((s, i) => {
              const past    = i < currentStatusIdx;
              const current = i === currentStatusIdx;
              const next    = i === currentStatusIdx + 1;
              return (
                <div key={s} className="flex items-center flex-1">
                  <button
                    onClick={() => next && handleStatusChange(s)}
                    disabled={!next || incident.status === 'resolved' || updatingStatus === s}
                    className={`
                      flex-1 py-1.5 px-2 text-xs font-semibold text-center rounded-lg transition-all capitalize
                      ${current ? 'bg-steelblue text-white' : ''}
                      ${past ? 'bg-emerald-500/20 text-emerald-300' : ''}
                      ${next && !updatingStatus ? 'bg-white/8 text-white hover:bg-steelblue/30 cursor-pointer' : ''}
                      ${next && updatingStatus ? 'bg-white/8 text-white opacity-50 cursor-not-allowed' : ''}
                      ${!past && !current && !next ? 'text-muted bg-white/4' : ''}
                    `}
                  >
                    {updatingStatus === s ? '⏳' : past ? '✓' : ''} {s}
                  </button>
                  {i < STATUS_ORDER.length - 1 && <div className="w-4 h-0.5 bg-white/10 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 border-b border-white/8 mb-4">
            {['overview', 'tasks', 'comms', 'ai', 'timeline'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition-all border-b-2 ${
                  activeTab === tab ? 'border-steelblue text-white' : 'border-transparent text-muted hover:text-white'
                }`}
              >
                {tab === 'ai' ? '🤖 AI Tools' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-4 fade-in">
              <div className="glass p-5 space-y-3">
                <h3 className="font-semibold text-sm text-white">Incident Details</h3>
                <Detail label="Zone" value={incident.zone} />
                <Detail label="Room" value={incident.room_number || '—'} />
                <Detail label="Reporter" value={incident.reporter_name} />
                <Detail label="Reported By" value={incident.reporter_type} />
                <Detail label="Created" value={new Date(incident.created_at).toLocaleString()} />
                <Detail label="AI Provider" value={incident.ai_provider || '—'} />
                <Detail label="Language Detected" value={incident.detected_language || 'en'} />
                {incident.is_drill ? <div className="text-xs text-purple-400 font-semibold">🔵 This is a drill exercise</div> : null}
              </div>
              <div className="space-y-4">
                <div className="glass p-5 space-y-2">
                  <h3 className="font-semibold text-sm text-white">Description</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{incident.description}</p>
                  {incident.description_translated && incident.detected_language !== 'en' && (
                    <div className="mt-2 pt-2 border-t border-white/8">
                      <p className="text-xs text-muted mb-1">🌐 English Translation:</p>
                      <p className="text-xs text-white/70">{incident.description_translated}</p>
                    </div>
                  )}
                </div>
                {incident.evacuation_route && (
                  <div className="glass bg-amber-500/5 border-amber-500/20 p-4 space-y-1">
                    <p className="text-xs font-bold text-amber-400">🚪 AI Evacuation Route</p>
                    <p className="text-sm text-white/80">{incident.evacuation_route}</p>
                  </div>
                )}
                {incident.recommended_responder && (
                  <div className="glass p-4 flex items-center gap-3">
                    <span className="text-xl">👤</span>
                    <div>
                      <p className="text-xs text-muted">AI Dispatch Recommendation</p>
                      <p className="font-semibold text-white">{incident.recommended_responder}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Tasks */}
          {activeTab === 'tasks' && (
            <div className="glass p-5 space-y-2 fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white">SOP Checklist</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{tasks.filter(t => t.is_complete).length}/{tasks.length} complete</span>
                  <button
                    onClick={openTaskModal}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-steelblue/30 border border-steelblue/30 text-white hover:bg-steelblue/45 transition-colors"
                  >
                    ＋ Add Task
                  </button>
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mb-4">
                <div
                  className="bg-emerald-400 h-1 rounded-full transition-all origin-left"
                  style={{ transform: `scaleX(${tasks.length ? (tasks.filter(t => t.is_complete).length / tasks.length) : 0})` }}
                />
              </div>
              {tasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!task.is_complete}
                    onChange={() => handleToggleTask(task.id)}
                    disabled={togglingTasks[task.id]}
                    className="w-4 h-4 accent-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm min-w-0 ${task.is_complete ? 'line-through text-muted' : 'text-white/90'}`}>{task.title}</span>
                  <span className="text-xs text-white/65">{getAssigneeName(task, usersById)}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${priorityClass(task.priority)}`}>{task.priority || 'medium'}</span>
                </label>
              ))}
            </div>
          )}

          {/* TAB: Comms */}
          {activeTab === 'comms' && (
            <div className="glass flex flex-col h-[500px] fade-in">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className="text-center text-muted text-sm py-8">No messages yet</p>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_name === user?.name ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      m.sender_name === user?.name ? 'bg-steelblue text-white' : 'bg-white/8 border border-white/10'
                    }`}>
                      <p className="text-[10px] text-white/50 mb-0.5 font-semibold">{m.sender_name}</p>
                      <p>{m.message}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/8 p-3 flex gap-2">
                <input
                  className="input-dark flex-1 text-sm"
                  placeholder="Send a coordination message…"
                  value={chatMsg}
                  onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                />
                <button
                  onClick={sendChat}
                  disabled={chatSending || !chatMsg.trim()}
                  className="px-4 py-2 bg-steelblue hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-semibold"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* TAB: AI Tools */}
          {activeTab === 'ai' && (
            <div className="space-y-4 fade-in">
              {/* Triage summary */}
              {triage && (
                <AITriagePanel triage={triage} provider={incident.ai_provider} />
              )}

              {/* AI actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass p-5 space-y-3">
                  <h3 className="font-semibold text-sm text-white">Post-Incident Debrief</h3>
                  <p className="text-xs text-muted">Generate an AI-written debrief report for compliance and training purposes.</p>
                  <button
                    onClick={generateDebrief}
                    disabled={loadingAI === 'debrief'}
                    className="w-full py-2.5 bg-steelblue/30 hover:bg-steelblue/50 border border-steelblue/30 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {loadingAI === 'debrief' ? '⏳ Generating…' : '📋 Generate Debrief'}
                  </button>
                </div>
                <div className="glass p-5 space-y-3">
                  <h3 className="font-semibold text-sm text-white">Guest Follow-Up</h3>
                  <p className="text-xs text-muted">Generate an empathetic follow-up message for the affected guest.</p>
                  <button
                    onClick={generateFollowup}
                    disabled={loadingAI === 'followup'}
                    className="w-full py-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-600/30 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {loadingAI === 'followup' ? '⏳ Generating…' : '💌 Generate Follow-Up'}
                  </button>
                </div>
              </div>

              {followup && (
                <div className="glass p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-white">💌 Guest Follow-Up Message</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(followup).then(() => addToast({ message: 'Copied!', type: 'success' }))}
                      className="text-xs px-3 py-1 bg-white/8 rounded-lg text-muted hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{followup}</p>
                </div>
              )}

              {/* CrisisBot */}
              <CrisisBot incidentContext={{ type: incident.type, zone: incident.zone, severity: incident.severity, description: incident.description }} />
            </div>
          )}

          {/* TAB: Timeline */}
          {activeTab === 'timeline' && (
            <div className="glass p-5 fade-in">
              <h3 className="font-semibold text-sm text-white mb-4">Event Timeline</h3>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />
                {timeline.map((e, i) => (
                  <div key={e.id} className="relative">
                    <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-steelblue border-2 border-navy" />
                    <div className="text-xs text-muted mb-0.5">{new Date(e.created_at).toLocaleString()} · {e.actor}</div>
                    <div className="text-sm text-white/80">{e.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {debrief && <DebriefModal report={debrief} incidentId={id} onClose={() => setDebrief(null)} />}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <form onSubmit={handleAddTask} className="w-full max-w-md rounded-xl border border-white/15 bg-navy/90 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Add Task</h3>
              <button type="button" onClick={closeTaskModal} className="text-muted hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-1">
              <label htmlFor="taskTitle" className="text-xs text-muted">Task title</label>
              <input
                id="taskTitle"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="input-dark w-full text-sm"
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="taskAssignee" className="text-xs text-muted">Assignee</label>
              <select
                id="taskAssignee"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="input-dark w-full text-sm"
                disabled={loadingUsers}
              >
                <option value="">Unassigned</option>
                {users.map((person) => (
                  <option key={person.id} value={person.id}>{person.name} (#{person.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="taskPriority" className="text-xs text-muted">Priority</label>
              <select
                id="taskPriority"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="input-dark w-full text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingTask || !taskTitle.trim()}
              className="w-full py-2.5 bg-steelblue hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              {creatingTask ? 'Adding…' : 'Add Task'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function getAssigneeName(task, usersById) {
  const key = task.assigned_to == null ? '' : String(task.assigned_to);
  return usersById[key]?.name || 'Unassigned';
}

function priorityClass(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
      return 'text-red-300 bg-red-500/20 border border-red-500/30';
    case 'high':
      return 'text-orange-300 bg-orange-500/20 border border-orange-500/30';
    case 'medium':
      return 'text-yellow-200 bg-yellow-500/15 border border-yellow-500/25';
    default:
      return 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/25';
  }
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
