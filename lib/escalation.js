const { createClient } = require('@supabase/supabase-js');
const supabase = require('./supabase');

let supabaseAdmin = null;

function getSupabaseAdminClient() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
}

// Service checks for escalation every 30 seconds
function startEscalationService(io) {
  setInterval(async () => {
    try {
      const admin = getSupabaseAdminClient() || supabase;
      if (!admin) {
        console.warn('[Escalation Service] Supabase client not configured.');
        return;
      }

      const threshold = new Date(Date.now() - 90 * 1000).toISOString();
      // Find incidents stuck in 'reported' state for > 90 seconds
      const { data: unacked, error: fetchError } = await admin
        .from('incidents')
        .select('*')
        .eq('status', 'reported')
        .lt('created_at', threshold);

      if (fetchError) {
        console.error('[Escalation Service] Failed to fetch stale incidents:', fetchError.message);
        return;
      }
      
      for (const incident of unacked || []) {
        if (incident.severity !== 'critical') {
          const { error: updateError } = await admin
            .from('incidents')
            .update({ severity: 'critical', updated_at: new Date().toISOString() })
            .eq('id', incident.id);
          if (updateError) {
            console.error('[Escalation Service] Failed to update incident severity:', updateError.message);
            continue;
          }

          const timelineRow = {
            incident_id: incident.id,
            actor: 'System',
            action: 'Auto-escalated to CRITICAL: No acknowledgment within 90 seconds.',
            created_at: new Date().toISOString(),
          };

          const { error: timelineError } = await admin.from('incident_timeline').insert(timelineRow);
          if (timelineError) {
            console.error('[Escalation Service] Failed to write timeline via Supabase:', timelineError.message);
          }

          if (io) {
            io.emit('incident:updated', { ...incident, severity: 'critical', status: 'reported' });
            io.emit('broadcast', {
              message: `Incident ${incident.id} auto-escalated to critical due to responder inactivity.`,
              target_role: 'staff',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (err) {
      console.error('[Escalation Service] Error running check:', err);
    }
  }, 30000);
}

module.exports = { startEscalationService };
