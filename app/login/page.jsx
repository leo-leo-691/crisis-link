'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = [
  { email: 'admin@grandhotel.com', password: 'demo1234', name: 'Crisis Admin', role: 'admin' },
  { email: 'manager@grandhotel.com', password: 'demo1234', name: 'Duty Manager', role: 'staff' },
  { email: 'staff@grandhotel.com', password: 'demo1234', name: 'Response Staff', role: 'staff' },
  { email: 'security@grandhotel.com', password: 'demo1234', name: 'Marcus Rivera', role: 'staff' },
  { email: 'frontdesk@grandhotel.com', password: 'demo1234', name: 'Priya Sharma', role: 'staff' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('crisislink_token', data.token);
      if (data.user?.role === 'admin') router.push('/admin/dashboard');
      else router.push('/staff/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-2">CrisisLink Login</h1>
        <p className="text-sm text-slate-400 mb-6">Use a demo account or sign in manually.</p>

        <form onSubmit={signIn} className="space-y-4 mb-8">
          {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</div>}

          <div>
            <label htmlFor="email" className="block text-sm mb-1">Email</label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">Password</label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <section>
          <h2 className="text-lg font-medium mb-3">Demo Accounts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-slate-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2">Password</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ACCOUNTS.map((account) => (
                  <tr
                    key={account.email}
                    className="border-b border-slate-800 cursor-pointer hover:bg-slate-800/60"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    <td className="py-2 pr-4">{account.name}</td>
                    <td className="py-2 pr-4 uppercase">{account.role}</td>
                    <td className="py-2 pr-4">{account.email}</td>
                    <td className="py-2">{account.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
