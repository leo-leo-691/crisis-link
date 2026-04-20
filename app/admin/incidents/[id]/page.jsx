'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge, TypeIcon } from '@/components/IncidentCard';
import CrisisBot from '@/components/CrisisBot';
import DebriefModal from '@/components/DebriefModal';
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
  const user   = useAuthStore(s => s.user);
  const token  = useAuthStore(s => s.token);
  const { fetchIncident, updateStatus, toggleTask, sendMessage } = useIncidentStore();
  const joinIncident = useSocketStore(s => s.joinIncident);
  const addToast     = useUIStore(s => s.addToast);

  const [data, setData]           = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [debrief, setDebrief]     = useState(null);
  const [followup, setFollowup]   = useState(null);
  const [loadingAI, setLoadingAI] = useState('');
  const [chatMsg, setChatMsg]     = useState('');
  const [chatSending, setChatSending] = useState(false);

  const load = async () => {
    const d = await fetchIncident(id);
    setData(d);
  };

  useEffect(() => {
    if (id) {
      load();
      joinIncident(id);
    }
  }, [id]);

  // Listen for realtime updates
  const socket = useSocketStore(s => s.socket);
  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on('incident:updated', handler);
    socket.on('incident:message', handler);
    socket.on('incident:task', handler);
    return () => { socket.off('incident:updated', handler); socket.off('incident:message', handler); socket.off('incident:task', handler); };
  }, [socket]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatus(id, newStatus);
      addToast({ message: `Status → ${newStatus}`, type: 'success' });
      load();
    } catch (e) { addToast({ message: e.message, type: 'error' }); }
  };

  const generateDebrief = async () => {
    setLoadingAI('debrief');
    try {
      const res = await fetch(`/api/incidents/${id}/debrief`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setDebrief(d.report);
    } catch (e) { addToast({ message: 'Debrief generation failed', type: 'error' }); }
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

  if (!data || !data.incident) return (
    <div className="flex h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-center text-muted gap-4">
        {!data ? (
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
                    disabled={!next || incident.status === 'resolved'}
                    className={`
                      flex-1 py-1.5 px-2 text-xs font-semibold text-center rounded-lg transition-all capitalize
                      ${current ? 'bg-steelblue text-white' : ''}
                      ${past ? 'bg-emerald-500/20 text-emerald-300' : ''}
                      ${next ? 'bg-white/8 text-white hover:bg-steelblue/30 cursor-pointer' : ''}
                      ${!past && !current && !next ? 'text-muted bg-white/4' : ''}
                    `}
                  >
                    {past ? '✓' : ''} {s}
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
                <span className="text-xs text-muted">{tasks.filter(t => t.is_complete).length}/{tasks.length} complete</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mb-4">
                <div
                  className="bg-emerald-400 h-1 rounded-full transition-all"
                  style={{ width: tasks.length ? `${(tasks.filter(t => t.is_complete).length / tasks.length) * 100}%` : '0%' }}
                />
              </div>
              {tasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!task.is_complete}
                    onChange={() => toggleTask(id, task.id).then(load)}
                    className="w-4 h-4 accent-emerald-400"
                  />
                  <span className={`text-sm ${task.is_complete ? 'line-through text-muted' : 'text-white/90'}`}>{task.title}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    task.priority === 'urgent' || task.priority === 'high' ? 'text-red-300 bg-red-500/10' : 'text-muted bg-white/6'
                  }`}>{task.priority}</span>
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
                <div className="glass p-5 space-y-3">
                  <h3 className="font-semibold text-sm text-white">AI Triage Analysis <span className="text-xs text-muted">({incident.ai_provider})</span></h3>
                  <p className="text-sm text-white/80">{triage.brief_summary}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Detail label="Est. Response Time" value={`${triage.estimated_response_time_minutes} min`} />
                    <Detail label="Confidence" value={`${triage.confidence}%`} />
                  </div>
                  {triage.recommended_actions?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {triage.recommended_actions.map((a, i) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <span className="text-steelblue font-bold flex-shrink-0">{i+1}.</span>
                            <span className="text-white/80">{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
