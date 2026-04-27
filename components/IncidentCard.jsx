'use client';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Severity Config ─────────────────────────────────── */
const SEV_CONFIG = {
  critical: {
    color: '#FF6B6B',
    bg: 'rgba(230,57,70,0.22)',
    border: 'rgba(230,57,70,0.55)',
    barColor: '#E63946',
    leftBorder: '#E63946',
    label: 'CRITICAL',
    glow: '0 0 20px rgba(230,57,70,0.28)',
    pulse: true,
  },
  high: {
    color: '#F4A261',
    bg: 'rgba(244,162,97,0.22)',
    border: 'rgba(244,162,97,0.55)',
    barColor: '#F4A261',
    leftBorder: '#F4A261',
    label: 'HIGH',
    glow: '0 0 14px rgba(244,162,97,0.18)',
    pulse: false,
  },
  medium: {
    color: '#FACC15',
    bg: 'rgba(250,204,21,0.20)',
    border: 'rgba(250,204,21,0.50)',
    barColor: '#FACC15',
    leftBorder: '#FACC15',
    label: 'MEDIUM',
    glow: 'none',
    pulse: false,
  },
  low: {
    color: '#2DC653',
    bg: 'rgba(45,198,83,0.20)',
    border: 'rgba(45,198,83,0.50)',
    barColor: '#2DC653',
    leftBorder: '#2DC653',
    label: 'LOW',
    glow: 'none',
    pulse: false,
  },
};

/* ── Type config ─────────────────────────────────────── */
const TYPE_CONFIG = {
  fire: { emoji: '🔥', bg: 'rgba(230,57,70,0.28)', border: 'rgba(230,57,70,0.55)' },
  medical: { emoji: '🚑', bg: 'rgba(69,123,157,0.28)', border: 'rgba(69,123,157,0.55)' },
  security: { emoji: '🔐', bg: 'rgba(244,162,97,0.28)', border: 'rgba(244,162,97,0.55)' },
  flood: { emoji: '🌊', bg: 'rgba(59,130,246,0.28)', border: 'rgba(59,130,246,0.55)' },
  evacuation: { emoji: '🚪', bg: 'rgba(250,204,21,0.25)', border: 'rgba(250,204,21,0.55)' },
  other: { emoji: '⚡', bg: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.55)' },
};

const STATUS_MAP = {
  reported: { text: 'rgba(232,234,240,0.50)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' },
  acknowledged: { text: '#7DBFEF', bg: 'rgba(69,123,157,0.18)', border: 'rgba(69,123,157,0.40)' },
  responding: { text: '#F4A261', bg: 'rgba(244,162,97,0.18)', border: 'rgba(244,162,97,0.40)' },
  contained: { text: '#FACC15', bg: 'rgba(250,204,21,0.18)', border: 'rgba(250,204,21,0.40)' },
  resolved: { text: '#2DC653', bg: 'rgba(45,198,83,0.18)', border: 'rgba(45,198,83,0.40)' },
};

/* ── Exported sub-components ─────────────────────────── */
export function SeverityBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.medium;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-bold mono"
      style={{
        padding: '3px 8px',
        borderRadius: 100,
        fontSize: 10,
        letterSpacing: '0.06em',
        background: cfg.bg,
        color: cfg.color,
        border: `0.5px solid ${cfg.border}`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: 5, height: 5, flexShrink: 0,
          background: cfg.barColor,
          animation: cfg.pulse ? 'ping 1.2s cubic-bezier(0,0,.2,1) infinite' : 'none',
        }}
      />
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.reported;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold mono uppercase"
      style={{
        padding: '3px 8px',
        borderRadius: 100,
        fontSize: 10,
        letterSpacing: '0.06em',
        background: s.bg,
        color: s.text,
        border: `0.5px solid ${s.border}`,
        transition: 'all 0.4s ease',
      }}
    >
      <span className="rounded-full" style={{ width: 5, height: 5, flexShrink: 0, background: s.text }} />
      {status}
    </span>
  );
}

export function TypeIcon({ type, size = 36 }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        background: cfg.bg,
        border: `0.5px solid ${cfg.border}`,
        fontSize: size * 0.45,
      }}
    >
      {cfg.emoji}
    </div>
  );
}

/* ── Main IncidentCard ───────────────────────────────── */
export default function IncidentCard({ incident, onClick, index = 0 }) {
  const sev = SEV_CONFIG[incident.severity] || SEV_CONFIG.medium;
  const diffMins = Math.round((Date.now() - new Date(incident.created_at).getTime()) / 60000);
  const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
  const isCritical = incident.severity === 'critical';

  return (
    <AnimatePresence>
      <motion.div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClick?.()}
        className={`incident-card glass animate-slide-up cursor-pointer group ${isCritical ? 'emergency-flash' : ''}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ x: 4, transition: { duration: 0.15 } }}
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '0.5px solid rgba(255,255,255,0.09)',
          borderLeft: `3px solid ${sev.leftBorder}`,
          borderRadius: 10,
          padding: '12px 14px',
          transition: 'all 0.2s ease',
          animationDelay: `${index * 60}ms`,
          boxShadow: isCritical ? sev.glow : 'none',
        }}
      >
        {/* Top row */}
        <div className="flex items-start gap-3">
          <TypeIcon type={incident.type} size={32} />

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center flex-wrap gap-1.5">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              {incident.is_drill && (
                <span className="mono font-bold" style={{
                  padding: '3px 8px', borderRadius: 100, fontSize: 10, letterSpacing: '0.06em',
                  background: 'rgba(168,85,247,0.18)', color: '#C084FC', border: '0.5px solid rgba(168,85,247,0.40)',
                }}>
                  DRILL
                </span>
              )}
            </div>
            {/* Zone */}
            <p className="font-semibold mt-1.5 truncate" style={{ fontSize: 14, color: 'rgba(232,234,240,0.92)' }}>
              {incident.zone}
            </p>
            {/* Description */}
            {incident.description && (
              <p className="mt-0.5 truncate" style={{ fontSize: 12, color: 'rgba(232,234,240,0.42)' }}>
                {incident.description.slice(0, 75)}
              </p>
            )}
          </div>

          {/* Right — time + ID */}
          <div className="text-right flex-shrink-0 space-y-1">
            <p className="mono" style={{ fontSize: 11, color: 'rgba(232,234,240,0.38)' }}>{timeAgo}</p>
            <p className="mono mt-1" style={{ fontSize: 10, color: 'rgba(232,234,240,0.25)' }}>
              #{incident.id?.slice(-6)}
            </p>
          </div>
        </div>

        {/* AI Dispatch row */}
        {incident.recommended_responder && (
          <div
            className="flex items-center gap-2 mt-2 pt-2"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <span style={{ fontSize: 12 }}>👤</span>
            <span style={{ fontSize: 12, color: 'rgba(69,123,157,0.90)' }}>
              AI Dispatch: <strong style={{ color: '#7DBFEF' }}>{incident.recommended_responder}</strong>
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
