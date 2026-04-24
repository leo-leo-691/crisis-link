'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge, TypeIcon } from '@/components/IncidentCard';
import EscalationTimer from '@/components/EscalationTimer';
import SeverityMeter from '@/components/SeverityMeter';
import AITriagePanel from '@/components/AITriagePanel';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';

const STATUS_ACTIONS = [
  { key: 'acknowledge', label: 'Acknowledge', nextStatus: 'acknowledged' },
  { key: 'start-response', label: 'Start Response', nextStatus: 'responding' },
  { key: 'contained', label: 'Mark Contained', nextStatus: 'contained' },
  { key: 'resolve', label: 'Resolve', nextStatus: 'resolved' },
];

export default function StaffIncidentDetailPage() {
  return (
    <AppProviders>
      <StaffIncidentDetailContent />
    </AppProviders>
  );
}

function StaffIncidentDetailContent() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { id } = useParams();
  const { fetchIncident, updateStatus, toggleTask, sendMessage, addTask } = useIncidentStore();
  const joinIncident = useSocketStore((s) => s.joinIncident);
  const data = useIncidentStore((s) => s.activeIncident);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [togglingTasks, setTogglingTasks] = useState({});
  const [chatMsg, setChatMsg] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'staff' && user.role !== 'admin') {
      router.push('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      await fetchIncident(id);
      joinIncident(id);
      setLoadingInitial(false);
    };
    load();
  }, [id, fetchIncident, joinIncident]);

  useEffect(() => {
    const scroller = mainRef.current;
    if (!scroller) return undefined;

    const updateProgress = () => {
      const total = scroller.scrollHeight - scroller.clientHeight;
      const progress = total <= 0 ? 0 : (scroller.scrollTop / total) * 100;
      const bar = document.getElementById('progress-bar');
      if (bar) {
        bar.style.transform = `scaleX(${progress / 100})`;
      }
    };

    scroller.addEventListener('scroll', updateProgress);
    updateProgress();
    return () => scroller.removeEventListener('scroll', updateProgress);
  }, [loadingInitial, activeTab, data?.incident?.id]);

  const incident = data?.incident;
  const tasks = data?.tasks || [];
  const messages = data?.messages || [];
  const timeline = data?.timeline || [];
  const triage = typeof incident?.ai_triage === 'string' ? safeParse(incident.ai_triage) : incident?.ai_triage;
  const debrief = safeParse(incident?.debrief_report);
  const debriefReady = incident?.status === 'resolved' && !!debrief;

  const handoffText = useMemo(() => incident ? buildHandoffReport(incident, triage, timeline) : '', [incident, triage, timeline]);

  const canApplyStatus = (target) => {
    if (!incident) return false;
    if (incident.status === target || incident.status === 'resolved') return false;
    const allowedMap = {
      reported: ['acknowledged', 'responding', 'resolved'],
      acknowledged: ['responding', 'contained', 'resolved'],
      responding: ['contained', 'resolved'],
      contained: ['resolved'],
      resolved: [],
    };
    return (allowedMap[incident.status] || []).includes(target);
  };

  const handleStatusAction = async (targetStatus) => {
    if (!incident || !canApplyStatus(targetStatus)) return;
    try {
      setUpdatingStatus(targetStatus);
      await updateStatus(id, targetStatus);
      await fetchIncident(id);
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setUpdatingStatus('');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      setTogglingTasks((current) => ({ ...current, [taskId]: true }));
      await toggleTask(id, taskId);
      await fetchIncident(id);
    } catch (error) {
      console.error('Failed to toggle task', error);
    } finally {
      setTogglingTasks((current) => ({ ...current, [taskId]: false }));
    }
  };

  const handleSendChat = async () => {
    if (!chatMsg.trim() || chatSending) return;
    try {
      setChatSending(true);
      await sendMessage(id, chatMsg, user?.name || 'Staff');
      setChatMsg('');
      await fetchIncident(id);
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setChatSending(false);
    }
  };

  const handleAddTask = async (event) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      setCreatingTask(true);
      await addTask(id, {
        title: taskTitle.trim(),
        priority: taskPriority,
        assigned_to: user?.id || null,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskPriority('medium');
      await fetchIncident(id);
    } catch (error) {
      console.error('Failed to create task', error);
    } finally {
      setCreatingTask(false);
    }
  };

  const copyHandoff = async () => {
    if (!handoffText) return;
    try {
      await navigator.clipboard.writeText(handoffText);
    } catch (error) {
      console.error('Failed to copy handoff report', error);
    }
  };

  const taskCompletion = tasks.length ? (tasks.filter((task) => task.is_complete).length / tasks.length) * 100 : 0;

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main ref={mainRef} className="flex-1 overflow-y-auto bg-grid relative">
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #E63946, #FF6B6B)',
            transformOrigin: 'left', transform: 'scaleX(0)',
            zIndex: 9999, transition: 'transform 0.1s linear',
          }}
          id="progress-bar"
        />

        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted hover:text-white text-sm transition-colors">← Back</button>
          {!loadingInitial && incident && (
            <>
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
            </>
          )}
        </div>

        {!loadingInitial && incident && (
          <div className="px-6 pt-4 pb-6 space-y-4">
            <div className="glass p-4 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-white">Live Response Controls</p>
                  <p className="text-xs text-muted">Run the incident through acknowledgement, response, containment, and resolution.</p>
                </div>
                <button
                  onClick={() => setShowHandoffModal(true)}
                  className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-colors"
                >
                  Generate Handoff Report
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    data-action={action.key}
                    onClick={() => handleStatusAction(action.nextStatus)}
                    disabled={!canApplyStatus(action.nextStatus) || updatingStatus === action.nextStatus}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-steelblue/20 border border-steelblue/30 hover:bg-steelblue/35 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {updatingStatus === action.nextStatus ? 'Updating...' : action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-white/10">
              <div className="flex gap-1 flex-wrap">
                {['overview', 'monitor', 'tasks', 'comms', 'timeline', 'ai', ...(incident.status === 'resolved' ? ['debrief'] : [])].map((tab) => (
                  <button
                    key={tab}
                    data-tab={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                      activeTab === tab ? 'border-steelblue text-white' : 'border-transparent text-muted hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="glass p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-white">Incident Overview</h2>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <DetailRow label="Type" value={incident.type} />
                    <DetailRow label="Zone" value={incident.zone} />
                    <DetailRow label="Severity" value={incident.severity} />
                    <DetailRow label="Status" value={incident.status} />
                    <DetailRow label="Reporter" value={incident.reporter_name || 'Unknown'} />
                    <DetailRow label="Timestamp" value={new Date(incident.created_at).toLocaleString()} />
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-muted mb-1">Description</p>
                    <p className="text-sm text-white/80 leading-relaxed">{incident.description || 'No description provided.'}</p>
                  </div>
                  {incident.evacuation_route && (
                    <div className="glass p-4 bg-amber-500/5 border-amber-500/20">
                      <p className="text-xs font-bold text-amber-400">Evacuation Route</p>
                      <p className="text-sm text-white/80 mt-1">{incident.evacuation_route}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="glass p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-white">Escalation Monitor</h2>
                    <EscalationTimer createdAt={incident.created_at} status={incident.status} />
                  </div>
                  <div className="glass p-4 space-y-2">
                    <h2 className="text-sm font-semibold text-white">Severity Meter</h2>
                    <SeverityMeter severity={incident.severity} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="space-y-4">
                <div className="glass p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-white">Escalation Timer</h2>
                  <EscalationTimer createdAt={incident.created_at} status={incident.status} />
                </div>
                <div className="glass p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-white">Operational Guidance</h2>
                  <SeverityMeter severity={incident.severity} />
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="glass p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">SOP Task Checklist</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{tasks.filter((task) => task.is_complete).length}/{tasks.length} complete</span>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-steelblue/30 border border-steelblue/30 text-white hover:bg-steelblue/45 transition-colors"
                    >
                      + Add Task
                    </button>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div className="bg-emerald-400 h-1 rounded-full transition-all origin-left" style={{ transform: `scaleX(${taskCompletion / 100})` }} />
                </div>
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <label key={`${task.id}-${index}`} className="glass p-3 flex items-center gap-3 hover:bg-white/5">
                      <input
                        data-task-checkbox={index === 0 ? 'primary' : `task-${task.id}`}
                        type="checkbox"
                        checked={!!task.is_complete}
                        onChange={() => handleToggleTask(task.id)}
                        disabled={togglingTasks[task.id]}
                        className="w-4 h-4 accent-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm block ${task.is_complete ? 'line-through text-muted' : 'text-white/90'}`}>{task.title}</span>
                        <span className="text-[11px] text-white/45">
                          {task.assignee_name ? `Assigned to ${task.assignee_name}` : 'Unassigned'}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityClass(task.priority)}`}>{task.priority || 'medium'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'comms' && (
              <div className="glass flex flex-col h-[520px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && <p className="text-center text-muted text-sm py-8">No messages yet</p>}
                  {messages.map((message, index) => (
                    <div key={`${message.id}-${index}`} className={`flex ${message.sender_name === user?.name ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                        message.sender_name === user?.name ? 'bg-steelblue text-white' : 'bg-white/8 border border-white/10'
                      }`}>
                        <p className="text-[10px] text-white/50 mb-0.5 font-semibold">{message.sender_name}</p>
                        <p>{message.message}</p>
                        <p className="text-[9px] text-white/30 mt-0.5">{new Date(message.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 p-3 flex gap-2">
                  <input
                    data-chat-input="incident"
                    className="input-dark flex-1 text-sm"
                    placeholder="Send a coordination message…"
                    value={chatMsg}
                    onChange={(event) => setChatMsg(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSendChat()}
                  />
                  <button
                    data-action="send-chat"
                    onClick={handleSendChat}
                    disabled={chatSending || !chatMsg.trim()}
                    className="px-4 py-2 bg-steelblue hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="glass p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Audit Timeline</h2>
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/10" />
                  {timeline.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="relative">
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-steelblue border-2 border-navy" />
                      <div className="text-xs text-muted mb-0.5">{new Date(entry.created_at).toLocaleString()} · {entry.actor}</div>
                      <div className="text-sm text-white/80">{entry.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <AITriagePanel triage={triage || fallbackTriage(incident)} provider={incident.ai_provider || 'fallback'} />
              </div>
            )}

            {activeTab === 'debrief' && incident.status === 'resolved' && (
              <div id="debrief-print" className="space-y-4">
                {!debriefReady && (
                  <div className="glass p-5 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-steelblue border-t-transparent animate-spin" />
                    <p className="text-sm text-white/80">Generating AI debrief report...</p>
                  </div>
                )}

                {debriefReady && (
                  <>
                    <DebriefSection title="Executive Summary" content={debrief.executive_summary} />
                    <ListSection title="What Went Well" items={debrief.what_went_well} itemClassName="text-sm text-green-300" prefix="✓" />
                    <ListSection title="Areas for Improvement" items={debrief.areas_for_improvement} itemClassName="text-sm text-orange-300" prefix="⚠" />
                    <DebriefSection title="Root Cause Analysis" content={debrief.root_cause_analysis} />
                    <ListSection title="Recommendations" items={debrief.recommendations} itemClassName="text-sm text-white/85" ordered />
                    <ListSection title="Training Recommendations" items={debrief.training_recommendations} itemClassName="text-sm text-blue-300" prefix="📚" />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {loadingInitial && (
          <div className="px-6 py-8 text-muted text-sm">Loading incident...</div>
        )}
      </main>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={handleAddTask} className="w-full max-w-md rounded-xl border border-white/15 bg-navy/95 p-5 space-y-3">
            <h3 className="text-white font-semibold">Add Task</h3>
            <input
              required
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              className="input-dark w-full text-sm"
              placeholder="Task title"
            />
            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value)}
              className="input-dark w-full text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="px-3 py-2 rounded-lg text-xs border border-white/20 text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingTask}
                className="px-3 py-2 rounded-lg text-xs bg-steelblue/35 border border-steelblue/35 text-white disabled:opacity-50"
              >
                {creatingTask ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showHandoffModal && incident && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-navy/95 backdrop-blur-xl p-5 space-y-4">
            <h3 className="text-sm font-mono font-bold tracking-wide text-white">INCIDENT HANDOFF REPORT</h3>
            <pre className="w-full max-h-[60vh] overflow-y-auto rounded-lg bg-black/25 border border-white/10 p-3 text-xs text-white/85 whitespace-pre-wrap font-mono">
              {handoffText}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                onClick={copyHandoff}
                className="px-3 py-2 rounded-lg bg-steelblue/30 border border-steelblue/35 hover:bg-steelblue/50 text-xs font-semibold text-white"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowHandoffModal(false)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #debrief-print, #debrief-print * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}

function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function fallbackTriage(incident) {
  return {
    brief_summary: incident?.description || 'Fallback triage generated while AI analysis completes.',
    estimated_response_time_minutes: 5,
    confidence: 70,
    recommended_actions: [
      'Assess scene safety immediately.',
      'Notify the duty manager and dispatch first responders.',
      'Secure the affected zone and maintain communication.',
    ],
    sop: [
      { step: 1, title: 'Assess Scene', instruction: 'Verify the area is safe before approaching.', responsible_role: 'Security', time_limit_minutes: 1 },
      { step: 2, title: 'Alert Team', instruction: 'Notify command staff and responders.', responsible_role: 'Front Desk', time_limit_minutes: 1 },
      { step: 3, title: 'Control Access', instruction: 'Keep guests away from the affected zone.', responsible_role: 'Security', time_limit_minutes: 2 },
      { step: 4, title: 'Provide Aid', instruction: 'Begin emergency response within training scope.', responsible_role: 'First Aid', time_limit_minutes: 2 },
      { step: 5, title: 'Escalate', instruction: 'Contact external emergency services if needed.', responsible_role: 'Manager', time_limit_minutes: 3 },
      { step: 6, title: 'Coordinate', instruction: 'Assign tasks and confirm accountability.', responsible_role: 'Manager', time_limit_minutes: 3 },
      { step: 7, title: 'Document', instruction: 'Log actions in chat and timeline.', responsible_role: 'Duty Officer', time_limit_minutes: 4 },
      { step: 8, title: 'Review', instruction: 'Prepare for containment and handoff.', responsible_role: 'Manager', time_limit_minutes: 5 },
    ],
    evacuation_route: incident?.evacuation_route || 'Use the nearest marked emergency exit and proceed to the main assembly point.',
    do_not_do: [
      'Do not move injured persons unless there is immediate danger.',
      'Do not allow unauthorized staff into the hot zone.',
      'Do not share unverified details with guests or media.',
    ],
  };
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border border-white/10 rounded-lg p-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs text-white/90 font-semibold capitalize">{value}</span>
    </div>
  );
}

function DebriefSection({ title, content }) {
  return (
    <div className="glass p-4">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/85">{content}</p>
    </div>
  );
}

function ListSection({ title, items = [], itemClassName, prefix, ordered }) {
  return (
    <div className="glass p-4">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <ul className="space-y-1">
        {(items || []).map((item, idx) => (
          <li key={`${title}-${idx}`} className={itemClassName}>
            {ordered ? `${idx + 1}. ${item}` : `${prefix || '•'} ${item}`}
          </li>
        ))}
      </ul>
    </div>
  );
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

function buildHandoffReport(incident, triage, timeline) {
  const lastEntries = (timeline || []).slice(-5);
  const recommended = Array.isArray(triage?.recommended_actions) ? triage.recommended_actions : [];
  const lines = [
    `ID: ${incident.id}`,
    `Type: ${incident.type}`,
    `Zone: ${incident.zone}`,
    `Severity: ${incident.severity}`,
    `Status: ${incident.status}`,
    `Reporter: ${incident.reporter_name || 'Unknown'}`,
    `Timestamp: ${new Date(incident.created_at).toLocaleString()}`,
    `Description: ${incident.description || 'N/A'}`,
    `AI Summary: ${triage?.brief_summary || 'N/A'}`,
    'Recommended Actions:',
    ...(recommended.length ? recommended.map((action, index) => `${index + 1}. ${action}`) : ['1. N/A']),
    `Evacuation Route: ${incident.evacuation_route || triage?.evacuation_route || 'N/A'}`,
    'Last 5 Timeline Entries:',
    ...(lastEntries.length
      ? lastEntries.map((entry, index) => `${index + 1}. ${new Date(entry.created_at).toLocaleString()} - ${entry.actor}: ${entry.action}`)
      : ['1. No timeline entries available.']),
  ];
  return lines.join('\n');
}
