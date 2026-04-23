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
  const { fetchIncident } = useIncidentStore();
  const joinIncident = useSocketStore(s => s.joinIncident);
  const data = useIncidentStore(s => s.activeIncident);
  const [loading, setLoading] = useState(true);

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
            <div className="glass p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Escalation Monitor</h2>
              <EscalationTimer createdAt={incident.created_at} status={incident.status} />
            </div>

            <div className="glass p-4 space-y-2">
              <h2 className="text-sm font-semibold text-white">Severity Meter</h2>
              <SeverityMeter severity={incident.severity} />
            </div>

            <div className="glass p-4">
              <h2 className="text-sm font-semibold text-white mb-2">Description</h2>
              <p className="text-sm text-white/80 leading-relaxed">{incident.description || 'No description provided.'}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-6 py-8 text-muted text-sm">Loading incident...</div>
        )}
      </main>
    </div>
  );
}
