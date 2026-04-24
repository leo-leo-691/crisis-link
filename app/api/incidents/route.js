import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { analyzeIncident } from '@/lib/aiTriage';
import { getIO } from '@/lib/socket';
import { SOP_TASKS } from '@/lib/sopTasks';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 5;

const INCIDENT_LIST_COLUMNS = [
  'id',
  'type',
  'severity',
  'status',
  'zone',
  'room_number',
  'reporter_name',
  'reporter_type',
  'description',
  'description_translated',
  'detected_language',
  'ai_provider',
  'evacuation_route',
  'recommended_responder',
  'resolved_at',
  'is_drill',
  'created_at',
  'updated_at',
].join(', ');

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

function isRateLimited(identifier) {
  const now = Date.now();
  const logs = rateLimitMap.get(identifier) || [];
  const recentLogs = logs.filter((time) => now - time < RATE_LIMIT_WINDOW);
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

function parseBooleanParam(value) {
  if (value == null) return null;
  return value === '1' || value === 'true';
}

async function emitSafely(callback) {
  try {
    const io = getIO();
    if (io) {
      await callback(io);
    }
  } catch (socketError) {
    console.error('[API Socket Emit Failed]', socketError);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const zone = searchParams.get('zone');
    const type = searchParams.get('type');
    const isDrill = parseBooleanParam(searchParams.get('is_drill'));
    const all = searchParams.get('all') === 'true';
    const limit = all ? null : Math.min(parseInt(searchParams.get('limit') || '50', 10), 50);

    let query = supabase
      .from('incidents')
      .select(INCIDENT_LIST_COLUMNS)
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);
    if (status === 'active') query = query.neq('status', 'resolved');
    else if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (zone) query = query.eq('zone', zone);
    if (type) query = query.eq('type', type);
    if (isDrill !== null) query = query.eq('is_drill', isDrill);

    const { data: incidents, error } = await query;
    if (error) throw error;

    return jsonNoStore(incidents || []);
  } catch (err) {
    console.error('[GET /api/incidents] Critical Failure:', err);
    return jsonNoStore({ error: 'Failed to fetch incidents', details: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(ip)) {
      return jsonNoStore({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const {
      id: clientId,
      type,
      zone,
      description,
      reporter_name,
      reporter_type = 'guest',
      room_number,
      is_drill = false,
    } = body;

    const isGuestUnauthed = !user && (reporter_type === 'guest' || reporter_type === 'anonymous' || !reporter_type);
    if (!user && !isGuestUnauthed) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !zone) {
      return jsonNoStore({ error: 'Incident type and zone are mandatory' }, { status: 400 });
    }

    const descText = description || `${type} incident reported in ${zone}`;
    const id = clientId || generateIncidentId();
    const now = new Date().toISOString();
    const severity = type === 'fire' || type === 'medical' ? 'high' : 'medium';
    const normalizedReporterType = user ? (reporter_type || 'staff') : 'guest';
    const normalizedIsDrill = user ? Boolean(is_drill) : false;

    const { data: inserted, error: insertError } = await supabase
      .from('incidents')
      .insert({
        id,
        type,
        severity,
        status: 'reported',
        zone,
        room_number: room_number || null,
        reporter_name: reporter_name || user?.name || user?.email || 'Anonymous',
        reporter_type: normalizedReporterType,
        description: descText,
        description_translated: descText,
        detected_language: 'en',
        ai_triage: null,
        ai_provider: 'pending',
        evacuation_route: null,
        recommended_responder: null,
        is_drill: normalizedIsDrill,
        created_at: now,
        updated_at: now,
      })
      .select(INCIDENT_LIST_COLUMNS)
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: dup, error: dupError } = await supabase
          .from('incidents')
          .select(INCIDENT_LIST_COLUMNS)
          .eq('id', id)
          .maybeSingle();
        if (dupError) throw dupError;
        return jsonNoStore({ success: true, incident: dup, duplicate: true }, { status: 200 });
      }
      throw insertError;
    }

    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    if (tasks?.length) {
      const { error: tasksError } = await supabase
        .from('incident_tasks')
        .insert(tasks.map((task) => ({ incident_id: id, title: task, priority: 'high' })));
      if (tasksError) throw tasksError;

      const { error: sopError } = await supabase.from('incidents').update({ sop_seeded: true }).eq('id', id);
      if (sopError) throw sopError;
    }

    const { error: timelineError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: reporter_name || user?.name || 'System',
      action: `Emergency broadcast initialized: ${type.toUpperCase()} in ${zone}`,
      created_at: now,
    });
    if (timelineError) throw timelineError;

    const { count: activeCount, error: activeCountError } = await supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved')
      .eq('is_drill', false);
    if (activeCountError) throw activeCountError;

    const newIncident = inserted;

    await emitSafely(async (io) => {
      io.emit('incident:new', newIncident);
      io.emit('live_count', { count: activeCount || 0 });
    });

    (async () => {
      try {
        const { data: staff, error: staffError } = await supabase
          .from('users')
          .select('id, name, zone_assignment')
          .eq('role', 'staff')
          .eq('is_active', true);
        if (staffError) throw staffError;

        const triageResult = await analyzeIncident(type, zone, descText);
        const triage = triageResult?.result || null;
        const provider = triageResult?.provider || 'failure-fallback';
        const dispatchRec = (staff || []).find((member) => member.zone_assignment && zone.toLowerCase().includes((member.zone_assignment || '').toLowerCase()))?.name
          || staff?.[0]?.name
          || null;

        const { error: updateError } = await supabase.from('incidents').update({
          severity: triage?.severity || severity,
          description_translated: descText,
          detected_language: 'en',
          ai_triage: triage,
          ai_provider: provider,
          evacuation_route: triage?.evacuation_route || null,
          recommended_responder: dispatchRec,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (updateError) throw updateError;

        const { data: updatedInc, error: updatedError } = await supabase
          .from('incidents')
          .select(INCIDENT_LIST_COLUMNS)
          .eq('id', id)
          .maybeSingle();
        if (updatedError) throw updatedError;

        await emitSafely(async (io) => {
          io.emit('incident:updated', updatedInc);
        });
      } catch (bgErr) {
        console.error('[AI Background] Error:', bgErr);
      }
    })();

    return jsonNoStore({ success: true, incident: newIncident }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/incidents] Submission Failure:', err);
    return jsonNoStore({ error: 'System processing error', details: err.message }, { status: 500 });
  }
}
