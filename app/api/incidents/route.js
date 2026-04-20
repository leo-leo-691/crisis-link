const { NextResponse } = require('next/server');
const crypto = require('crypto');

function generateIncidentId() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INC-${date}-${rand}`;
}

module.exports.GET = async function GET(request) {
  try {
    const db = require('@/lib/db');
    const { searchParams } = new URL(request.url);

    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    const status   = searchParams.get('status');
    const severity = searchParams.get('severity');
    const zone     = searchParams.get('zone');
    const type     = searchParams.get('type');
    const limit    = parseInt(searchParams.get('limit') || '100');

    if (status)   { sql += ' AND status = ?';   params.push(status); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    if (zone)     { sql += ' AND zone = ?';     params.push(zone); }
    if (type)     { sql += ' AND type = ?';     params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const incidents = db.prepare(sql).all(...params);
    const totalActive = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved')").get().c;

    return NextResponse.json({ incidents, totalActive });
  } catch (err) {
    console.error('[GET /api/incidents]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

module.exports.POST = async function POST(request) {
  try {
    const db = require('@/lib/db');
    const { analyzeIncident, tryTranslation, getDispatchRecommendation } = require('@/lib/aiTriage');
    const { getIO } = require('@/lib/socket');
    const { SOP_TASKS } = require('@/lib/db');

    const body = await request.json();
    const {
      type, zone, description, reporter_name, reporter_type = 'guest',
      room_number, is_drill = 0,
    } = body;

    if (!type || !zone) {
      return NextResponse.json({ error: 'type and zone are required' }, { status: 400 });
    }

    const descText = description || `${type} incident reported in ${zone}`;
    const id = generateIncidentId();
    const now = new Date().toISOString();

    // Run AI Triage + translation in parallel
    const [triageResult, translationResult] = await Promise.allSettled([
      analyzeIncident(type, zone, descText),
      tryTranslation(descText),
    ]);

    const { result: triage, provider } = triageResult.status === 'fulfilled'
      ? triageResult.value
      : { result: null, provider: 'error' };

    const { translated, detected_language } = translationResult.status === 'fulfilled'
      ? translationResult.value
      : { translated: descText, detected_language: 'en' };

    const severity = triage?.severity || 'medium';
    const evacRoute = triage?.evacuation_route || null;

    // Smart dispatch recommendation
    const staff = db.prepare("SELECT * FROM users WHERE role = 'staff' AND is_active = 1").all();
    const activeIncs = db.prepare("SELECT * FROM incidents WHERE status NOT IN ('resolved')").all();
    let dispatchRec = null;
    try {
      const d = await getDispatchRecommendation(id, type, zone, activeIncs, staff);
      dispatchRec = d.recommended_name;
    } catch (e) { /* silent */ }

    // Insert incident
    db.prepare(`
      INSERT INTO incidents 
      (id, type, severity, status, zone, room_number, reporter_name, reporter_type, description,
       description_translated, detected_language, ai_triage, ai_provider, evacuation_route,
       recommended_responder, is_drill, created_at, updated_at)
      VALUES (?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, severity, zone, room_number || null, reporter_name || 'Anonymous',
      reporter_type, descText, translated, detected_language,
      triage ? JSON.stringify(triage) : null, provider, evacRoute, dispatchRec, is_drill ? 1 : 0,
      now, now,
    );

    // Seed SOP tasks
    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    const insertTask = db.prepare('INSERT INTO incident_tasks (incident_id, title, priority) VALUES (?, ?, ?)');
    for (const t of tasks) insertTask.run(id, t, 'high');
    db.prepare('UPDATE incidents SET sop_seeded = 1 WHERE id = ?').run(id);

    // Timeline entry
    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES (?, ?, ?, ?)').run(
      id, reporter_name || 'Guest', `Incident reported: ${descText.slice(0, 80)}`, now
    );

    // Emit to all connected clients
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    const io = getIO();
    if (io) {
      io.emit('incident:new', incident);
      io.emit('live_count', { count: activeIncs.length + 1 });
    }

    return NextResponse.json({ incident, triage, provider, dispatch_recommendation: dispatchRec }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/incidents]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
