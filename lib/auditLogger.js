/**
 * Incident Action Tracker
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const logAudit = async (action, entityType, entityId, details = null) => {
  try {
    const uuid = require('crypto').randomUUID();
    await db.query(
      'INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [uuid, action, entityType, entityId, details ? JSON.stringify(details) : null]
    );
    
    // Also console log for debugging
    console.log(`[AUDIT] ${action} on ${entityType} ${entityId}`);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = { logAudit };
