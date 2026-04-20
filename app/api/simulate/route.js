import { NextResponse } from 'next/server';
import crypto from 'crypto';

const db = require('@/lib/db');
const { MOCK_SCENARIOS } = require('@/lib/mockAI');
const { logAudit } = require('@/lib/auditLogger');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    
    // Simulate is a high-risk endpoint for demo purposes only
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required for simulation' }, { status: 401 });
    }

    const id = crypto.randomUUID();
    const title = "Simulated Demo: Kitchen Fire";
    const description = "Smoke reported near the main kitchen stoves.";
    
    // Inject Mock AI
    const triageData = MOCK_SCENARIOS.fire;

    // Database Insert
    await db.query(
      'INSERT INTO incidents (id, type, description, severity, zone, reporter_name, reporter_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, 'Fire', description, triageData.severity, 'Kitchen Zone', 'SimRunner', 'staff', 'reported']
    );

    if (triageData.actions) {
      for (const action of triageData.actions) {
        await db.query('INSERT INTO incident_tasks (incident_id, title, priority) VALUES ($1, $2, $3)', [id, action, 'high']);
      }
    }

    const incResult = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
    const incident = incResult.rows[0];
    logAudit('CREATE_SIMULATION', 'incident', id);

    // Simulated flow over websockets
    const io = (require('@/lib/socket')).getIO();
    if (io) {
      io.emit('incident:new', incident);
      io.emit('broadcast', { message: `DEMO STARTED: Kitchen Fire`, target_role: 'all', timestamp: new Date().toISOString() });
      
      // Delay Assignment update
      setTimeout(async () => {
        try {
          await db.query("UPDATE incidents SET status = 'acknowledged', updated_at = NOW() WHERE id = $1", [id]);
          const upRes = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
          const updated = upRes.rows[0];
          io.emit('incident:update', updated);
          logAudit('SCENARIO_RUNNER', 'incident', id, { status: "acknowledged" });
          
          // Delay resolved update
          setTimeout(async () => {
             try {
                await db.query("UPDATE incidents SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
                const finRes = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
                const final = finRes.rows[0];
                io.emit('incident:update', final);
                io.emit('broadcast', { message: 'Demo scenario resolved successfully.', target_role: 'all', timestamp: new Date().toISOString() });
                logAudit('SCENARIO_RUNNER', 'incident', id, { status: "resolved" });
             } catch (e) { console.error('Sim resolution error', e); }
          }, 5000);
        } catch (e) { console.error('Sim ack error', e); }
      }, 3000);
    }
    
    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error) {
    console.error('Demo Engine Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
