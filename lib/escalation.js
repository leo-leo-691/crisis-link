const db = require('./db');
const { logAudit } = require('./auditLogger');

// Service checks for escalation every 30 seconds
function startEscalationService(io) {
  setInterval(() => {
    try {
      // Find incidents stuck in 'Created' state for > 90 seconds
      // SQLite datetime logic: julianday diff is in days. * 86400 converts to seconds.
      const stmt = db.prepare(`
        SELECT * FROM incidents 
        WHERE status = 'Created' 
        AND (julianday('now') - julianday(created_at)) * 86400 > 90
      `);
      
      const unacked = stmt.all();
      
      for (const incident of unacked) {
        if (incident.severity !== 'CRITICAL') {
          const upgrade = db.prepare("UPDATE incidents SET severity = 'CRITICAL' WHERE id = ?");
          upgrade.run(incident.id);
          
          logAudit('ESCALATE', 'incident', incident.id, { reason: 'Timeout (90s)' });
          
          if (io) {
            io.emit('incident_updated', { ...incident, severity: 'CRITICAL' });
            io.emit('broadcast', {
              type: 'WARNING',
              message: `Incident ${incident.title || incident.id} auto-escalated to CRITICAL due to responder inactivity.`
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
