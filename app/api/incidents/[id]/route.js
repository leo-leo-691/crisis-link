const { NextResponse } = require('next/server');
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = params;

    const [
      { data: incident, error: incError },
      { data: tasks, error: tasksError },
      { data: messages, error: msgError },
      { data: timeline, error: timeError },
    ] = await Promise.all([
      supabase.from('incidents').select('*').eq('id', id).maybeSingle(),
      supabase.from('incident_tasks').select('*').eq('incident_id', id).order('id', { ascending: true }),
      supabase.from('incident_messages').select('*').eq('incident_id', id).order('created_at', { ascending: true }),
      supabase.from('incident_timeline').select('*').eq('incident_id', id).order('created_at', { ascending: true }),
    ]);

    if (incError) throw incError;
    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;

    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ 
      incident, 
      tasks: tasks || [], 
      messages: messages || [], 
      timeline: timeline || [] 
    });
  } catch (err) {
    console.error('[GET /api/incidents/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const { id } = params;

    const [
      { error: tasksError },
      { error: msgError },
      { error: timeError },
      { error: incError },
    ] = await Promise.all([
      supabase.from('incident_tasks').delete().eq('incident_id', id),
      supabase.from('incident_messages').delete().eq('incident_id', id),
      supabase.from('incident_timeline').delete().eq('incident_id', id),
      supabase.from('incidents').delete().eq('id', id),
    ]);

    if (tasksError) throw tasksError;
    if (msgError) throw msgError;
    if (timeError) throw timeError;
    if (incError) throw incError;

    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
