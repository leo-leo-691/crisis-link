import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { SOP_TASKS } from '@/lib/sopTasks';

const DEFAULT_ZONES = [
  ['Lobby', 1, 40, 380, 200, 100],
  ['Front Desk', 1, 260, 380, 120, 100],
  ['Restaurant', 1, 400, 380, 200, 100],
  ['Bar & Lounge', 1, 620, 380, 170, 100],
  ['Pool Deck', 1, 40, 260, 250, 100],
  ['Gym & Spa', 1, 310, 260, 200, 100],
  ['Grand Ballroom', 1, 530, 260, 260, 100],
  ['Floor 1 East', 2, 40, 140, 180, 80],
  ['Floor 1 West', 2, 240, 140, 180, 80],
  ['Floor 2 East', 3, 440, 140, 180, 80],
  ['Floor 2 West', 3, 640, 140, 180, 80],
  ['Kitchen', 1, 400, 340, 100, 30],
  ['Laundry', 0, 520, 340, 80, 30],
  ['Server Room', 2, 40, 100, 60, 30],
];

const DEMO_USERS = [
  { email: 'admin@grandhotel.com', name: 'Crisis Admin', role: 'admin', zone_assignment: 'Lobby' },
  { email: 'manager@grandhotel.com', name: 'Duty Manager', role: 'staff', zone_assignment: 'Front Desk' },
  { email: 'staff@grandhotel.com', name: 'Response Staff', role: 'staff', zone_assignment: 'Restaurant' },
  { email: 'security@grandhotel.com', name: 'Marcus Rivera', role: 'staff', zone_assignment: 'Server Room' },
  { email: 'frontdesk@grandhotel.com', name: 'Priya Sharma', role: 'staff', zone_assignment: 'Lobby' },
];

const SEED_INCIDENTS = [
  {
    id: 'INC-SEED-0001',
    type: 'medical',
    zone: 'Restaurant',
    description: 'Guest collapsed near table 12, unconscious',
    reporter_name: 'Demo Guest',
    reporter_type: 'guest',
    is_drill: false,
  },
  {
    id: 'INC-SEED-0002',
    type: 'security',
    zone: 'Lobby',
    description: 'Aggressive behavior reported near the front desk queue',
    reporter_name: 'Anonymous Guest',
    reporter_type: 'guest',
    is_drill: false,
  },
  {
    id: 'INC-SEED-0003',
    type: 'fire',
    zone: 'Kitchen',
    description: 'Smoke detected near ventilation hood, staff investigating',
    reporter_name: 'Restaurant Staff',
    reporter_type: 'staff',
    is_drill: false,
  },
];

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const bcrypt = require('bcrypt');

    // 1) Ensure zones baseline (14)
    const { count: zoneCount, error: zoneCountError } = await supabase
      .from('venue_zones')
      .select('id', { count: 'exact', head: true });
    if (zoneCountError) throw zoneCountError;
    if ((zoneCount || 0) === 0) {
      const { error: zonesInsertError } = await supabase.from('venue_zones').insert(
        DEFAULT_ZONES.map((z) => ({
          name: z[0],
          floor: z[1],
          map_x: z[2],
          map_y: z[3],
          map_width: z[4],
          map_height: z[5],
        }))
      );
      if (zonesInsertError) throw zonesInsertError;
    }

    // 2) Ensure demo users baseline (5)
    // We upsert by email to avoid breaking existing non-demo users (if any).
    const hash = await bcrypt.hash('demo1234', 10);
    for (const u of DEMO_USERS) {
      const { error } = await supabase
        .from('users')
        .upsert({
          email: u.email.toLowerCase(),
          password_hash: hash,
          name: u.name,
          role: u.role,
          zone_assignment: u.zone_assignment,
          is_active: true,
        }, { onConflict: 'email' });
      if (error) throw error;
    }

    // 3) Reset incidents to exactly 3
    // Delete child tables first to satisfy FK constraints (if present).
    await supabase.from('incident_tasks').delete().neq('id', 0);
    await supabase.from('incident_messages').delete().neq('id', 0);
    await supabase.from('incident_timeline').delete().neq('id', 0);
    await supabase.from('incidents').delete().neq('id', '');

    const now = new Date().toISOString();
    const toInsert = SEED_INCIDENTS.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.type === 'fire' ? 'critical' : i.type === 'medical' ? 'high' : 'medium',
      status: 'reported',
      zone: i.zone,
      room_number: null,
      reporter_name: i.reporter_name,
      reporter_type: i.reporter_type,
      description: i.description,
      description_translated: i.description,
      detected_language: 'en',
      ai_triage: null,
      ai_provider: 'pending',
      evacuation_route: null,
      recommended_responder: null,
      is_drill: i.is_drill,
      created_at: now,
      updated_at: now,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('incidents')
      .insert(toInsert)
      .select('*');
    if (insertError) throw insertError;

    // Seed SOP tasks + timeline entries
    for (const inc of inserted || []) {
      const tasks = SOP_TASKS[inc.type] || SOP_TASKS.other || [];
      if (tasks.length) {
        const { error: taskError } = await supabase
          .from('incident_tasks')
          .insert(tasks.map((t) => ({ incident_id: inc.id, title: t, priority: 'high' })));
        if (taskError) throw taskError;
      }

      const { error: timeError } = await supabase.from('incident_timeline').insert({
        incident_id: inc.id,
        actor: inc.reporter_name || 'System',
        action: `Seed incident created: ${inc.type.toUpperCase()} in ${inc.zone}`,
        created_at: now,
      });
      if (timeError) throw timeError;
    }

    const [{ count: users }, { count: zones }, { count: incidents }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('venue_zones').select('id', { count: 'exact', head: true }),
      supabase.from('incidents').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({ success: true, counts: { users: users || 0, zones: zones || 0, incidents: incidents || 0 } });
  } catch (err) {
    console.error('[POST /api/seed]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

