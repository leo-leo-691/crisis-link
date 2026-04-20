import { NextResponse } from 'next/server';
import crypto from 'crypto';

const db = require('@/lib/db');
const { MOCK_SCENARIOS } = require('@/lib/mockAI');
const { logAudit } = require('@/lib/auditLogger');

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const id = crypto.randomUUID();
    const title = "Simulated Demo: Kitchen Fire";
    const description = "Smoke reported near the main kitchen stoves.";
    
    // Inject Mock AI
    const triageData = MOCK_SCENARIOS.fire;

    // Database Insert
    const insert = db.prepare('INSERT INTO incidents (id, title, description, category, severity, zone, reporter_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run(id, title, description, triageData.category, triageData.severity, 'Kitchen Zone', 'demo_runner');

    if (triageData.actions) {
      const taskInsert = db.prepare('INSERT INTO tasks (id, incident_id, title) VALUES (?, ?, ?)');
      triageData.actions.forEach(action => {
        taskInsert.run(crypto.randomUUID(), id, action);
      });
    }

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    logAudit('CREATE_SIMULATION', 'incident', id);

    // Simulated flow over websockets
    if (global.io) {
      global.io.emit('new_incident', incident);
      global.io.emit('broadcast', { type: 'ALERT', message: `DEMO STARTED: ${title}` });
      
      // Delay Assignment update
      setTimeout(() => {
        const ack = db.prepare("UPDATE incidents SET status = 'Acknowledged', acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?");
        ack.run(id);
        const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
        global.io.emit('incident_updated', updated);
        logAudit('SCENARIO_RUNNER', 'incident', id, { status: "Acknowledged" });
        
        // Delay resolved update
        setTimeout(() => {
          const res = db.prepare("UPDATE incidents SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?");
          res.run(id);
          const final = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
          global.io.emit('incident_updated', final);
          global.io.emit('broadcast', { type: 'INFO', message: 'Demo scenario resolved successfully.' });
          logAudit('SCENARIO_RUNNER', 'incident', id, { status: "Resolved" });
        }, 5000);
      }, 3000);
    }
    
    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error) {
    console.error('Demo Engine Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
