'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';
import useAuthStore from '@/lib/stores/authStore';

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'staff',
  zone_assignment: '',
};

export default function AdminStaffPage() {
  return (
    <AppProviders>
      <AdminStaffContent />
    </AppProviders>
  );
}

function AdminStaffContent() {
  const { user, loading: authLoading } = useAuthStore();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoneForQr, setZoneForQr] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/staff/dashboard');
    }
  }, [authLoading, user, router]);

  const authHeader = useMemo(
    () => {
      const browserToken = typeof window !== 'undefined' ? localStorage.getItem('crisislink_token') : null;
      return { Authorization: `Bearer ${token || browserToken || ''}` };
    },
    [token]
  );

  const loadUsers = async () => {
    const res = await fetch('/api/users', { headers: authHeader });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to fetch users');
    setUsers(Array.isArray(payload) ? payload : []);
  };

  const loadZones = async () => {
    const res = await fetch('/api/zones', { headers: authHeader });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to fetch zones');
    const nextZones = Array.isArray(payload) ? payload : [];
    setZones(nextZones);
    if (!zoneForQr && nextZones[0]?.name) setZoneForQr(nextZones[0].name);
  };

  const load = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadZones()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user]);

  const openAddModal = () => {
    setEditingUserId(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEditModal = (person) => {
    setEditingUserId(person.id);
    setForm({
      name: person.name || '',
      email: person.email || '',
      password: '',
      role: person.role || 'staff',
      zone_assignment: person.zone_assignment || '',
    });
    setModalOpen(true);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUserId) {
        const body = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          zone_assignment: form.zone_assignment.trim() || null,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify(body),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to update user');
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            zone_assignment: form.zone_assignment.trim() || null,
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to create user');
      }

      setModalOpen(false);
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (error) {
      alert(error.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (person) => {
    if (!window.confirm('Deactivate this staff member?')) return;
    try {
      const res = await fetch(`/api/users/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ is_active: false }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to deactivate user');
      await loadUsers();
    } catch (error) {
      alert(error.message || 'Failed to deactivate user');
    }
  };

  const qrValue = typeof window !== 'undefined' && zoneForQr
    ? `${window.location.origin}/sos?zone=${encodeURIComponent(zoneForQr)}`
    : '';

  const downloadQrPng = () => {
    const canvas = document.getElementById('zone-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `crisislink-qr-${zoneForQr || 'zone'}.png`;
    link.click();
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-grid">
        <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 pl-14 lg:pl-6 pr-6 py-3 flex items-center">
          <h1 className="text-lg font-bold text-white">Staff Management</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">All Staff</h2>
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-steelblue/30 border border-steelblue/35 hover:bg-steelblue/50 text-white"
              >
                Add Staff
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-muted">Loading staff...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted text-xs border-b border-white/10">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Zone</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((person) => (
                      <tr key={person.id} className="border-b border-white/5">
                        <td className="py-3 text-white">{person.name}</td>
                        <td className="py-3 text-white/85">{person.email}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 border border-white/15 text-white">{person.role}</span>
                        </td>
                        <td className="py-3 text-white/80">{person.zone_assignment || '—'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${person.is_active ? 'bg-green-500/15 border-green-500/25 text-green-300' : 'bg-red-500/15 border-red-500/25 text-red-300'}`}>
                            {person.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(person)}
                              className="px-2 py-1 text-xs rounded bg-white/8 border border-white/15 text-white hover:bg-white/15"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deactivateUser(person)}
                              className="px-2 py-1 text-xs rounded bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">QR Codes</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={zoneForQr}
                onChange={(e) => setZoneForQr(e.target.value)}
                className="input-dark text-sm"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.name}>{zone.name}</option>
                ))}
              </select>
              <button
                onClick={downloadQrPng}
                className="px-3 py-2 text-xs rounded-lg bg-steelblue/30 border border-steelblue/35 text-white hover:bg-steelblue/50"
              >
                Download PNG
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                Print All Zones
              </button>
            </div>

            {zoneForQr && qrValue && (
              <div className="inline-block p-3 rounded-lg bg-white">
                <QRCodeCanvas id="zone-qr-canvas" value={qrValue} size={200} />
              </div>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <form onSubmit={saveUser} className="w-full max-w-md rounded-xl border border-white/15 bg-navy/95 p-5 space-y-3">
              <h3 className="text-white font-semibold">{editingUserId ? 'Edit Staff' : 'Add Staff'}</h3>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input-dark w-full text-sm"
                placeholder="Name"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="input-dark w-full text-sm"
                placeholder="Email"
              />
              <input
                type="password"
                required={!editingUserId}
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="input-dark w-full text-sm"
                placeholder={editingUserId ? 'Password (optional)' : 'Password'}
              />
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                className="input-dark w-full text-sm"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <input
                value={form.zone_assignment}
                onChange={(e) => setForm((prev) => ({ ...prev, zone_assignment: e.target.value }))}
                className="input-dark w-full text-sm"
                placeholder="Zone"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-2 rounded-lg text-xs border border-white/20 text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-xs bg-steelblue/35 border border-steelblue/35 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUserId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
