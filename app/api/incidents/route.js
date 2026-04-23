import { NextResponse } from 'next/server';
import { analyzeIncident, tryTranslation, getDispatchRecommendation } from '@/lib/aiTriage';
import { getIO } from '@/lib/socket';
import { SOP_TASKS, query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Simple Rate Limiting (Server-side in-memory Map)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(identifier) {
  const now = Date.now();
  const logs = rateLimitMap.get(identifier) || [];
  const recentLogs = logs.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentLogs.length >= MAX_REQUESTS_PER_WINDOW) return true;
  
  recentLogs.push(now);
  rateLimitMap.set(identifier, recentLogs);
  return false;
}

function generateIncidentId() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INC-${date}-${rand}`;
}

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);

    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];
    let pIdx = 1;

    const status   = searchParams.get('status');
    const severity = searchParams.get('severity');
    const zone     = searchParams.get('zone');
    const type     = searchParams.get('type');
    const limit    = parseInt(searchParams.get('limit') || '100');

    if (status)   { sql += ` AND status = $${pIdx++}`;   params.push(status); }
    if (severity) { sql += ` AND severity = $${pIdx++}`; params.push(severity); }
    if (zone)     { sql += ` AND zone = $${pIdx++}`;     params.push(zone); }
    if (type)     { sql += ` AND type = $${pIdx++}`;     params.push(type); }
    
    sql += ` ORDER BY created_at DESC LIMIT $${pIdx++}`;
    params.push(limit);

    const [result, countResult] = await Promise.all([
      query(sql, params),
      query("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved')")
    ]);

    return NextResponse.json({ 
      incidents: result.rows, 
      totalActive: parseInt(countResult.rows[0].c || '0') 
    });
  } catch (err) {
    console.error('[GET /api/incidents] Critical Failure:', err);
    return NextResponse.json({ error: 'Failed to fetch incidents', details: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const {
      id: clientId, type, zone, description, reporter_name, reporter_type = 'guest',
      room_number, is_drill = false,
    } = body;

    if (!type || !zone) {
      return NextResponse.json({ error: 'Incident type and zone are mandatory' }, { status: 400 });
    }

    const descText = description || `${type} incident reported in ${zone}`;
    const id = clientId || generateIncidentId();
    const now = new Date().toISOString();

    const severity = type === 'fire' || type === 'medical' ? 'high' : 'medium';

    // Persist Incident Data immediately (Idempotent)
    try {
      await query(`
        INSERT INTO incidents 
        (id, type, severity, status, zone, room_number, reporter_name, reporter_type, description,
         description_translated, detected_language, ai_triage, ai_provider, evacuation_route,
         recommended_responder, is_drill, created_at, updated_at)
        VALUES ($1, $2, $3, 'reported', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        id, type, severity, zone, room_number || null, reporter_name || 'Anonymous',
        reporter_type, descText, descText, 'en',
        null, 'pending', null, null, is_drill,
        now, now,
      ]);
    } catch (err) {
      if (err.code === '23505') { // Postgres duplicate key violation
        const dup = await query('SELECT * FROM incidents WHERE id = $1', [id]);
        return NextResponse.json({ success: true, incident: dup.rows[0], duplicate: true }, { status: 200 });
      }
      throw err;
    }

    // Initialize SOP Tasks
    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    if (tasks && tasks.length > 0) {
      await Promise.all(tasks.map(t => 
        query('INSERT INTO incident_tasks (incident_id, title, priority) VALUES ($1, $2, $3)', [id, t, 'high'])
      ));
      await query('UPDATE incidents SET sop_seeded = TRUE WHERE id = $1', [id]);
    }

    // Log to Timeline
    await query('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES ($1, $2, $3, $4)', [
      id, reporter_name || 'System', `Emergency broadcast initialized: ${type.toUpperCase()} in ${zone}`, now
    ]);

    // Fetch active incidents (also needed for live_count)
    const activeIncsResult = await query("SELECT * FROM incidents WHERE status NOT IN ('resolved')");
    const activeIncs = activeIncsResult.rows;

    // Realtime Broadcast
    const incidentResult = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    const incident = incidentResult.rows[0];
    const io = getIO();
    if (io) {
      io.emit('incident:new', incident);
      io.emit('live_count', { count: activeIncs.length });
    }

    // AI Execution Pipeline (Background)
    (async () => {
      try {
        const staffResult = await query("SELECT * FROM users WHERE role = 'staff' AND is_active = TRUE");
        const staff = staffResult.rows;

        const [triageResult, translationResult, dispatchResult] = await Promise.allSettled([
          analyzeIncident(type, zone, descText),
          tryTranslation(descText),
          getDispatchRecommendation(id, type, zone, activeIncs, staff),
        ]);

        const triage = triageResult.status === 'fulfilled' ? triageResult.value.result : null;
        const provider = triageResult.status === 'fulfilled' ? triageResult.value.provider : 'failure-fallback';
        const translated = translationResult.status === 'fulfilled' ? translationResult.value.translated : descText;
        const detected_language = translationResult.status === 'fulfilled' ? translationResult.value.detected_language : 'en';
        const dispatchRec = dispatchResult.status === 'fulfilled' ? dispatchResult.value.recommended_name : null;

        const aiSeverity = triage?.severity || severity;
        const evacRoute = triage?.evacuation_route || null;

        await query(`
          UPDATE incidents 
          SET severity = $1, description_translated = $2, detected_language = $3, 
              ai_triage = $4, ai_provider = $5, evacuation_route = $6, recommended_responder = $7,
              updated_at = $8
          WHERE id = $9
        `, [aiSeverity, translated, detected_language, triage ? JSON.stringify(triage) : null, provider, evacRoute, dispatchRec, new Date().toISOString(), id]);

        if (io) {
          const updatedInc = await query('SELECT * FROM incidents WHERE id = $1', [id]);
          io.emit('incident:updated', updatedInc.rows[0]);
        }
      } catch (bgErr) {
        console.error('[AI Background] Error:', bgErr);
      }
    })();

    return NextResponse.json({ 
      success: true,
      incident 
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/incidents] Submission Failure:', err);
    return NextResponse.json({ error: 'System processing error', details: err.message }, { status: 500 });
  }
}

