'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import { SeverityBadge, StatusBadge, TypeIcon } from '@/components/IncidentCard';
import EscalationTimer from '@/components/EscalationTimer';
import SeverityMeter from '@/components/SeverityMeter';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useSocketStore from '@/lib/stores/socketStore';

export default function StaffIncidentDetailPage() {
  return (
    <AppProviders>
      <StaffIncidentDetailContent />
    </AppProviders>
  );
}

function StaffIncidentDetailContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { id } = useParams();
  const { fetchIncident, updateStatus } = useIncidentStore();
  const joinIncident = useSocketStore(s => s.joinIncident);
  const data = useIncidentStore(s => s.activeIncident);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'staff' && user.role !== 'admin') { router.push('/login'); }
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      await fetchIncident(id);
      joinIncident(id);
      setLoading(false);
    };
    load();
  }, [id]);

  const incident = data?.incident;
  const timeline = data?.timeline || [];
  const triage = typeof incident?.ai_triage === 'string' ? safeParse(incident.ai_triage) : incident?.ai_triage;
  const debrief = safeParse(incident?.debrief_report);
  const debriefReady = incident?.status === 'resolved' && !!debrief;
  const tabItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'monitor', label: 'Monitor' },
    { key: 'description', label: 'Description' },
    ...(incident?.status === 'resolved' ? [{ key: 'debrief', label: 'Debrief' }] : []),
  ];

  useEffect(() => {
    if (incident?.status !== 'resolved' && activeTab === 'debrief') {
      setActiveTab('overview');
    }
  }, [incident?.status, activeTab]);

  const handoffText = incident ? buildHandoffReport(incident, triage, timeline) : '';

  const copyHandoff = async () => {
    if (!handoffText) return;
    try {
      await navigator.clipboard.writeText(handoffText);
      alert('Handoff report copied.');
    } catch (e) {
      alert('Failed to copy handoff report.');
    }
  };

  const STATUS_ACTIONS = [
    { key: 'acknowledge', label: 'Acknowledge', nextStatus: 'acknowledged' },
    { key: 'start-response', label: 'Start Response', nextStatus: 'responding' },
    { key: 'mark-contained', label: 'Mark Contained', nextStatus: 'contained' },
    { key: 'resolve', label: 'Resolve', nextStatus: 'resolved' },
  ];

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

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-muted hover:text-white text-sm transition-colors">← Back</button>
          {!loading && incident && (
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

        {!loading && incident && (
          <div className="px-6 pt-4 pb-6 space-y-4">
            <div className="border-b border-white/10">
              <div className="flex gap-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                      activeTab === tab.key ? 'border-steelblue text-white' : 'border-transparent text-muted hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'overview' && (
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
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
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
            )}

            {activeTab === 'monitor' && (
              <>
                <div className="glass p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-white">Escalation Monitor</h2>
                  <EscalationTimer createdAt={incident.created_at} status={incident.status} />
                </div>

                <div className="glass p-4 space-y-2">
                  <h2 className="text-sm font-semibold text-white">Severity Meter</h2>
                  <SeverityMeter severity={incident.severity} />
                </div>
              </>
            )}

            {activeTab === 'description' && (
              <div className="glass p-4">
                <h2 className="text-sm font-semibold text-white mb-2">Description</h2>
                <p className="text-sm text-white/80 leading-relaxed">{incident.description || 'No description provided.'}</p>
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
                    <div className="glass p-4 bg-white/5">
                      <h3 className="text-sm font-semibold text-white mb-2">Executive Summary</h3>
                      <p className="text-sm text-white/85">{debrief.executive_summary}</p>
                    </div>

                    <div className="glass p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">What Went Well</h3>
                      <ul className="space-y-1">
                        {(debrief.what_went_well || []).map((item, idx) => (
                          <li key={`well-${idx}`} className="text-sm text-green-300">✓ {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Areas for Improvement</h3>
                      <ul className="space-y-1">
                        {(debrief.areas_for_improvement || []).map((item, idx) => (
                          <li key={`improve-${idx}`} className="text-sm text-orange-300">⚠ {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Root Cause Analysis</h3>
                      <p className="text-sm text-white/80 leading-relaxed">{debrief.root_cause_analysis}</p>
                    </div>

                    <div className="glass p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Recommendations</h3>
                      <ol className="space-y-1">
                        {(debrief.recommendations || []).map((item, idx) => (
                          <li key={`recommend-${idx}`} className="text-sm text-white/85">{idx + 1}. {item}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="glass p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Training Recommendations</h3>
                      <ul className="space-y-1">
                        {(debrief.training_recommendations || []).map((item, idx) => (
                          <li key={`train-${idx}`} className="text-sm text-blue-300">📚 {item}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-steelblue/30 border border-steelblue/40 hover:bg-steelblue/50 text-sm font-semibold text-white"
                    >
                      Download as PDF
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="px-6 py-8 text-muted text-sm">Loading incident...</div>
        )}

        {!loading && incident && (
          <div className="sticky bottom-0 z-20 border-t border-white/10 bg-navy/80 backdrop-blur-xl px-6 py-3 flex justify-end">
            <button
              onClick={() => setShowHandoffModal(true)}
              className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-colors"
            >
              Generate Handoff Report
            </button>
          </div>
        )}
      </main>

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
  } catch (e) {
    return null;
  }
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border border-white/10 rounded-lg p-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs text-white/90 font-semibold capitalize">{value}</span>
    </div>
  );
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
