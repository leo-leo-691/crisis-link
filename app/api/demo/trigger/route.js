const { NextResponse } = require('next/server');

const INCIDENT_TYPES = ['fire', 'medical', 'security', 'flood', 'evacuation', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ZONES = ['Lobby', 'Restaurant', 'Kitchen', 'Pool Area', 'Gym', 'Floor 2', 'Conference Room A', 'Parking', 'Spa'];
const DESCRIPTIONS = {
  fire: ['Smoke detected in guest corridor', 'Trash can fire near east stairwell', 'Alarm triggered in laundry room'],
  medical: ['Guest collapsed near pool', 'Allergic reaction at restaurant table 8', 'Guest fell in bathroom, possible fracture'],
  security: ['Unauthorized entry attempt at staff entrance', 'Loud altercation in lobby area', 'Suspicious package near front desk'],
  flood: ['Pipe burst in 3rd floor bathroom', 'Water pool in elevator lobby', 'Roof leak in conference room A'],
  evacuation: ['Building-wide evacuation drill', 'Suspicious odor reported in HVAC system'],
  other: ['Power outage in east wing', 'Elevator stuck between floors'],
};
const REPORTERS = ['James Miller', 'Sarah B.', 'Anonymous Guest', 'Room 412', 'Restaurant Staff'];

// POST /api/demo/trigger — inject a simulated incident for demo autopilot
module.exports.POST = async function POST(request) {
  try {
    const db = require('@/lib/db');
    const { analyzeIncident } = require('@/lib/aiTriage');
    const { getIO } = require('@/lib/socket');
    const { SOP_TASKS } = require('@/lib/db');

    const type     = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
    const zone     = ZONES[Math.floor(Math.random() * ZONES.length)];
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    const descs    = DESCRIPTIONS[type] || DESCRIPTIONS.other;
    const desc     = descs[Math.floor(Math.random() * descs.length)];
    const reporter = REPORTERS[Math.floor(Math.random() * REPORTERS.length)];

    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const id = `DEMO-${date}-${rand}`;
    const now = new Date().toISOString();

    const { result: triage, provider } = await analyzeIncident(type, zone, desc);

    db.prepare(`
      INSERT INTO incidents (id, type, severity, status, zone, reporter_name, reporter_type, description, ai_triage, ai_provider, evacuation_route, is_drill, created_at, updated_at)
      VALUES (?, ?, ?, 'reported', ?, ?, 'guest', ?, ?, ?, ?, 1, ?, ?)
    `).run(id, type, triage?.severity || severity, zone, reporter, desc, triage ? JSON.stringify(triage) : null, provider, triage?.evacuation_route || null, now, now);

    // Seed SOP tasks
    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    for (const t of tasks) db.prepare('INSERT INTO incident_tasks (incident_id, title, priority) VALUES (?, ?, ?)').run(id, t, 'high');

    db.prepare('INSERT INTO incident_timeline (incident_id, actor, action, created_at) VALUES (?, ?, ?, ?)')
      .run(id, reporter, `[DEMO] Incident reported: ${desc.slice(0, 60)}`, now);

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    const io = getIO();
    if (io) io.emit('incident:new', incident);

    return NextResponse.json({ incident, provider }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/demo/trigger]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
