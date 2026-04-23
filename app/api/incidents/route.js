import { NextResponse } from 'next/server';
import { analyzeIncident } from '@/lib/aiTriage';
import { getIO } from '@/lib/socket';
import supabase from '@/lib/supabase';
import { SOP_TASKS } from '@/lib/sopTasks';
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

    const status   = searchParams.get('status');
    const severity = searchParams.get('severity');
    const zone     = searchParams.get('zone');
    const type     = searchParams.get('type');
    const limit    = parseInt(searchParams.get('limit') || '100');

    let q = supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status) q = q.eq('status', status);
    if (severity) q = q.eq('severity', severity);
    if (zone) q = q.eq('zone', zone);
    if (type) q = q.eq('type', type);

    const [{ data: incidents, error: listError }, { count, error: countError }] = await Promise.all([
      q,
      supabase.from('incidents').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
    ]);
    if (listError) throw listError;
    if (countError) throw countError;

    return NextResponse.json({
      incidents: incidents || [],
      totalActive: count || 0,
    });
  } catch (err) {
    console.error('[GET /api/incidents] Critical Failure:', err);
    return NextResponse.json({ error: 'Failed to fetch incidents', details: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);

    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const {
      id: clientId, type, zone, description, reporter_name, reporter_type = 'guest',
      room_number, is_drill = false,
    } = body;

    const isGuestUnauthed = !user && (reporter_type === 'guest' || reporter_type === 'anonymous' || !reporter_type);
    if (!user && !isGuestUnauthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !zone) {
      return NextResponse.json({ error: 'Incident type and zone are mandatory' }, { status: 400 });
    }

    const descText = description || `${type} incident reported in ${zone}`;
    const id = clientId || generateIncidentId();
    const now = new Date().toISOString();

    const severity = type === 'fire' || type === 'medical' ? 'high' : 'medium';
    const normalizedReporterType = user ? (reporter_type || 'staff') : 'guest';
    const normalizedIsDrill = user ? is_drill : false;

    // Persist Incident Data immediately (Idempotent)
    const { data: inserted, error: insertError } = await supabase
      .from('incidents')
      .insert({
        id,
        type,
        severity,
        status: 'reported',
        zone,
        room_number: room_number || null,
        reporter_name: reporter_name || (user?.name || user?.email) || 'Anonymous',
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
      .select('*')
      .maybeSingle();
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: dup, error: dupError } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
        if (dupError) throw dupError;
        return NextResponse.json({ success: true, incident: dup, duplicate: true }, { status: 200 });
      }
      throw insertError;
    }

    // Initialize SOP Tasks
    const tasks = SOP_TASKS[type] || SOP_TASKS.other;
    if (tasks && tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('incident_tasks')
        .insert(tasks.map((t) => ({ incident_id: id, title: t, priority: 'high' })));
      if (tasksError) throw tasksError;

      const { error: sopError } = await supabase.from('incidents').update({ sop_seeded: true }).eq('id', id);
      if (sopError) throw sopError;
    }

    // Log to Timeline
    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: reporter_name || 'System',
      action: `Emergency broadcast initialized: ${type.toUpperCase()} in ${zone}`,
      created_at: now,
    });
    if (timeError) throw timeError;

    // Fetch active incidents (also needed for live_count)
    const { count: activeCount, error: activeCountError } = await supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved');
    if (activeCountError) throw activeCountError;

    // Realtime Broadcast
    const newIncident = inserted;
    const io = getIO();
    if (io) {
      io.emit('incident:new', newIncident);
      io.emit('live_count', { count: activeCount || 0 });
    }

    // AI Execution Pipeline (Background)
    (async () => {
      try {
        const { data: staff, error: staffError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'staff')
          .eq('is_active', true);
        if (staffError) throw staffError;

        const triageResult = await analyzeIncident(type, zone, descText);

        const triage = triageResult?.result || null;
        const provider = triageResult?.provider || 'failure-fallback';
        const translated = descText;
        const detected_language = 'en';
        const dispatchRec = (staff || []).find(s => s.zone_assignment && zone.toLowerCase().includes((s.zone_assignment || '').toLowerCase()))?.name
          || staff?.[0]?.name
          || null;

        const aiSeverity = triage?.severity || severity;
        const evacRoute = triage?.evacuation_route || null;

        const { error: updateError } = await supabase.from('incidents').update({
          severity: aiSeverity,
          description_translated: translated,
          detected_language,
          ai_triage: triage,
          ai_provider: provider,
          evacuation_route: evacRoute,
          recommended_responder: dispatchRec,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (updateError) throw updateError;

        if (io) {
          const { data: updatedInc } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
          io.emit('incident:updated', updatedInc);
        }
      } catch (bgErr) {
        console.error('[AI Background] Error:', bgErr);
      }
    })();

    return NextResponse.json({ 
      success: true,
      incident: newIncident,
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/incidents] Submission Failure:', err);
    return NextResponse.json({ error: 'System processing error', details: err.message }, { status: 500 });
  }
}

