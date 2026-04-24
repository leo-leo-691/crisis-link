'use client';
import { useEffect } from 'react';
import useAuthStore from '@/lib/stores/authStore';
import useSocketStore from '@/lib/stores/socketStore';
import useUIStore from '@/lib/stores/uiStore';
import ToastContainer from './ToastContainer';
import BroadcastBanner from './BroadcastBanner';
import CriticalAlertBanner from './CriticalAlertBanner';
import DemoAutopilot from './DemoAutopilot';

export default function AppProviders({ children }) {
  const initAuth   = useAuthStore(s => s.init);
  const token      = useAuthStore(s => s.token);
  const initSocket = useSocketStore(s => s.initSocket);
  const initUI     = useUIStore(s => s.init);
  const reqNotif   = useSocketStore(s => s.requestNotifications);

  useEffect(() => {
    initUI();
    initAuth().then(() => {
      // After auth loaded, init socket with token
      const tok = localStorage.getItem('crisislink_token');
      if (tok) {
        initSocket(tok);
        reqNotif();
      }
    });
  }, []);

  // Re‑init socket if token changes
  useEffect(() => {
    if (token) initSocket(token);
  }, [token]);

  return (
    <>
      {children}
      <ToastContainer />
      <BroadcastBanner />
      <CriticalAlertBanner />
      <DemoAutopilot />
    </>
  );
}
