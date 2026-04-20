const db = require('./db');
const { logAudit } = require('./auditLogger');

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
          
          logAudit('ESCALATE', 'incident', incident.id, { reason: 'Timeout (90s)' });
          
          if (io) {
            io.emit('incident:update', { ...incident, severity: 'critical', status: 'reported' });
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
