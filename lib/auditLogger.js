/**
 * Incident Action Tracker
 */

const supabase = require('@/lib/supabase');

const logAudit = async (action, entityType, entityId, details = null) => {
  try {
    // Always console log (never fail request handlers)
    console.log(`[AUDIT] ${action} on ${entityType} ${entityId}`);

    // Best-effort persistence to timeline when applicable
    if (entityType === 'incident' && entityId) {
      await supabase.from('incident_timeline').insert({
        incident_id: entityId,
        actor: 'System',
        action: `[AUDIT] ${action}${details ? ` — ${JSON.stringify(details).slice(0, 180)}` : ''}`,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = { logAudit };
