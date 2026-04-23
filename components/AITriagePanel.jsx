'use client';
import { motion } from 'framer-motion';

const roleChipClass = 'text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/85';
const timeChipClass = 'text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/15 text-orange-300';

export default function AITriagePanel({ triage, provider }) {
  if (!triage) return null;

  const sop = Array.isArray(triage.sop) ? triage.sop.slice(0, 8) : [];
  const doNotDo = Array.isArray(triage.do_not_do) ? triage.do_not_do.slice(0, 3) : [];

  return (
    <div className="glass p-5 space-y-4">
      <motion.h3 className="font-semibold text-sm text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 * 0.1 }}>
        AI Triage Analysis <span className="text-xs text-muted">({provider || '—'})</span>
      </motion.h3>
      <motion.p className="text-sm text-white/80" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 * 0.1 }}>{triage.brief_summary}</motion.p>

      <motion.div className="grid grid-cols-2 gap-3 text-xs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 * 0.1 }}>
        <Detail label="Est. Response Time" value={`${triage.estimated_response_time_minutes} min`} />
        <Detail label="Confidence" value={`${triage.confidence}%`} />
      </motion.div>

      {triage.recommended_actions?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 * 0.1 }}>
          <p className="text-xs text-muted mb-2">Recommended Actions:</p>
          <ul className="space-y-1">
            {triage.recommended_actions.map((action, index) => (
              <li key={`${action}-${index}`} className="text-xs flex items-start gap-2">
                <span className="text-steelblue font-bold flex-shrink-0">{index + 1}.</span>
                <span className="text-white/80">{action}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {sop.length > 0 && (
        <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4 * 0.1 }}>
          <h4 className="text-[11px] font-mono uppercase tracking-widest text-white/70">STANDARD OPERATING PROCEDURE</h4>
          <ol className="space-y-2">
            {sop.map((item, index) => (
              <li key={`sop-${item.step ?? index + 1}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-bold">
                    {item.step ?? index + 1}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title || `Step ${index + 1}`}</p>
                    <p className="text-xs text-white/80 leading-relaxed">{item.instruction}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={roleChipClass}>{item.responsible_role || 'Assigned Staff'}</span>
                      <span className={timeChipClass}>{item.time_limit_minutes ?? 0} min</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {triage.evacuation_route && (
        <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5 * 0.1 }}>
          <h4 className="text-[11px] font-mono uppercase tracking-widest text-white/70">EVACUATION ROUTE</h4>
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 flex items-start gap-2">
            <span className="text-green-300 text-sm leading-none mt-0.5">↗</span>
            <p className="text-sm text-green-100/90">{triage.evacuation_route}</p>
          </div>
        </motion.div>
      )}

      {doNotDo.length > 0 && (
        <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 6 * 0.1 }}>
          <h4 className="text-[11px] font-mono uppercase tracking-widest text-red-300">DO NOT DO</h4>
          <ul className="space-y-1.5">
            {doNotDo.map((rule, index) => (
              <li key={`dont-${index}`} className="flex items-start gap-2">
                <span className="text-red-400 text-xs mt-0.5">✕</span>
                <span className="text-xs text-red-100/90">{rule}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
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
