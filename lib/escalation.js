const { createClient } = require('@supabase/supabase-js');
const db = require('./db');

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
      // Find incidents stuck in 'reported' state for > 90 seconds
      const result = await db.query(`
        SELECT * FROM incidents 
        WHERE status = 'reported' 
        AND created_at < NOW() - INTERVAL '90 seconds'
      `);
      
      const unacked = result.rows;
      
      for (const incident of unacked) {
        if (incident.severity !== 'critical') {
          await db.query("UPDATE incidents SET severity = 'critical', updated_at = NOW() WHERE id = $1", [incident.id]);

          const timelineRow = {
            incident_id: incident.id,
            actor: 'System',
            action: 'Auto-escalated to CRITICAL: No acknowledgment within 90 seconds.',
            created_at: new Date().toISOString(),
          };

          const supabase = getSupabaseAdminClient();
          if (supabase) {
            const { error } = await supabase.from('incident_timeline').insert(timelineRow);
            if (error) {
              console.error('[Escalation Service] Failed to write timeline via Supabase:', error.message);
            }
          } else {
            console.warn('[Escalation Service] Supabase client not configured; falling back to DB query for timeline insert');
            await db.query(
              'INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES ($1, $2, $3, $4)',
              [timelineRow.incident_id, timelineRow.actor, timelineRow.action, timelineRow.created_at]
            );
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
