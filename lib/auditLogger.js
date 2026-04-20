/**
 * Incident Action Tracker
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const logAudit = (action, entityType, entityId, details = null) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)');
    const uuid = require('crypto').randomUUID();
    stmt.run(uuid, action, entityType, entityId, details ? JSON.stringify(details) : null);
    
    // Also console log for debugging
    console.log(`[AUDIT] ${action} on ${entityType} ${entityId}`);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = { logAudit };
