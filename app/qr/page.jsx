'use client';
import { useEffect, useState } from 'react';
import AppProviders from '@/components/AppProviders';
import Sidebar from '@/components/Sidebar';

const QR_ZONES = [
  { id: 'lobby',       name: 'Lobby',           room: null },
  { id: 'restaurant',  name: 'Restaurant',       room: null },
  { id: 'pool',        name: 'Pool Area',        room: null },
  { id: 'gym',         name: 'Gym',              room: null },
  { id: 'spa',         name: 'Spa',              room: null },
  { id: 'bar',         name: 'Bar/Lounge',       room: null },
  { id: 'conf-a',      name: 'Conference Room A', room: null },
  { id: 'floor1',      name: 'Floor 1',          room: null },
  { id: 'floor2',      name: 'Floor 2',          room: null },
  { id: 'parking',     name: 'Parking',          room: null },
];

function QRCard({ zone }) {
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const url = baseUrl ? `${baseUrl}/sos?zone=${encodeURIComponent(zone.name)}${zone.room ? `&room=${zone.room}` : ''}` : '';
  // Use a public QR generation API
  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&color=ffffff&bgcolor=1A2035`
    : '';

  const download = async () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `crisislink-qr-${zone.id}.png`;
    a.click();
  };

  const copyLink = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="glass p-5 flex flex-col items-center gap-3 hover:border-steelblue/30 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center text-xl">📍</div>
      <p className="font-semibold text-white text-sm">{zone.name}</p>
      <div className="rounded-xl overflow-hidden border border-white/10 min-h-[160px] min-w-[160px] flex items-center justify-center bg-white/5">
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt={`QR for ${zone.name}`} width={160} height={160} className="block" />
        ) : (
          <span className="text-xs text-white/35">Generating QR...</span>
        )}
      </div>
      <p className="text-[9px] text-muted font-mono text-center break-all max-w-[160px]">{url || 'Preparing zone link...'}</p>
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="px-3 py-1.5 text-xs bg-white/8 hover:bg-white/14 rounded-lg text-muted hover:text-white transition-colors"
        >
          📋 Copy Link
        </button>
        <button
          onClick={download}
          className="px-3 py-1.5 text-xs bg-steelblue/30 hover:bg-steelblue/50 rounded-lg text-white transition-colors"
        >
          ⬇️ Download
        </button>
      </div>
    </div>
  );
}

export default function QRCodesPage() {
  const [customRoom, setCustomRoom] = useState('');

  return (
    <AppProviders>
      <div className="flex h-screen bg-navy overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-grid">
          <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-xl border-b border-white/8 px-6 py-3">
            <h1 className="font-bold text-white">QR Code Manager</h1>
            <p className="text-xs text-muted">Generate and print emergency QR codes for each zone</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Info */}
            <div className="glass bg-steelblue/5 border-steelblue/20 p-5 flex items-start gap-4">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold text-white text-sm">How to deploy QR codes</p>
                <p className="text-xs text-muted mt-1">
                  Print and place each QR code in the corresponding area of the venue.
                  When a guest scans the code during an emergency, they are immediately directed
                  to the SOS page with the zone pre-filled.
                </p>
              </div>
            </div>

            {/* Zone QRs */}
            <div>
              <h2 className="font-semibold text-white mb-4">Zone QR Codes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {QR_ZONES.map(z => <QRCard key={z.id} zone={z} />)}
              </div>
            </div>

            {/* Custom room generator */}
            <div className="glass p-5 space-y-4">
              <h2 className="font-semibold text-white text-sm">Generate Room QR Code</h2>
              <div className="flex gap-3">
                <input
                  className="input-dark flex-1"
                  placeholder="Room number (e.g. 412)"
                  value={customRoom}
                  onChange={e => setCustomRoom(e.target.value)}
                />
              </div>
              {customRoom && (
                <QRCard zone={{ id: `room-${customRoom}`, name: `Room ${customRoom}`, room: customRoom }} />
              )}
            </div>
          </div>
        </main>
      </div>
    </AppProviders>
  );
}
