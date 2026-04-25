'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import IncidentCard from '@/components/IncidentCard';
import useAuthStore from '@/lib/stores/authStore';
import useIncidentStore from '@/lib/stores/incidentStore';
import useUIStore from '@/lib/stores/uiStore';

export default function IncidentsListPage() {
  return (
    <AppProviders>
      <IncidentsListContent />
    </AppProviders>
  );
}

function IncidentsListContent() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { incidents, fetchIncidents } = useIncidentStore();
  const addToast = useUIStore(s => s.addToast);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/staff/dashboard'); }
  }, [loading, user, router]);

  const load = async () => {
    setIsRefreshing(true);
    try {
      await fetchIncidents({});
    } catch (e) {
      addToast({ message: 'Failed to refresh incidents', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = 
        inc.id.toLowerCase().includes(search.toLowerCase()) ||
        inc.type.toLowerCase().includes(search.toLowerCase()) ||
        inc.description?.toLowerCase().includes(search.toLowerCase()) ||
        inc.zone.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inc.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
      const createdAt = inc.created_at ? new Date(inc.created_at) : null;
      const fromOk = !fromDate || (createdAt && createdAt >= new Date(`${fromDate}T00:00:00`));
      const toOk = !toDate || (createdAt && createdAt <= new Date(`${toDate}T23:59:59`));

      return matchesSearch && matchesStatus && matchesSeverity && fromOk && toOk;
    });
  }, [incidents, search, statusFilter, severityFilter, fromDate, toDate]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filteredIncidents, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `incidents-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#05070F' }}>
      <Sidebar active="incidents" />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="mono font-bold mb-1" style={{ fontSize: 10, color: '#E63946', letterSpacing: '0.2em' }}>
                  CENTRAL COMMAND
                </p>
                <h1 className="text-3xl font-black text-white">Incident Stream</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={load}
                  className={`p-2.5 rounded-xl border border-white/10 transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'hover:bg-white/5'}`}
                  title="Refresh List"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push('/admin/incidents/new')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
                  style={{ background: '#E63946', color: 'white' }}
                >
                  <span>+</span> Log New Incident
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div 
              className="p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 border border-white/5"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              {/* Search */}
              <div className="relative flex-1 w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                <input
                  type="text"
                  placeholder="Search by ID, type, or description..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-all"
                  style={{ fontSize: 14 }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer dark-select"
                style={{ fontSize: 14, minWidth: 150 }}
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="responding">Responding</option>
                <option value="contained">Contained</option>
                <option value="resolved">Resolved</option>
              </select>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-all cursor-pointer dark-select"
                style={{ fontSize: 14, minWidth: 150 }}
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-all"
                style={{ fontSize: 14 }}
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-all"
                style={{ fontSize: 14 }}
              />
              <button
                onClick={exportJson}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm"
              >
                Export JSON
              </button>
            </div>

            {/* Results Counters */}
            <div className="flex items-center gap-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  MATCHING: <span className="text-white font-bold">{filteredIncidents.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  TOTAL: <span className="text-white font-bold">{incidents.length}</span>
                </span>
              </div>
            </div>

            {/* Incident Cards */}
            {filteredIncidents.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                <div className="text-4xl mb-4 opacity-50">Empty Stream</div>
                <p className="text-white/40 max-w-sm mx-auto">No incidents match your current filtering criteria. Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredIncidents.map((inc, idx) => (
                  <IncidentCard 
                    key={inc.id} 
                    incident={inc} 
                    index={idx}
                    onClick={() => router.push(`/admin/incidents/${inc.id}`)}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
