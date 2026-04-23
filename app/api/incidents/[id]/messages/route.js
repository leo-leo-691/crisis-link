const { NextResponse } = require('next/server');

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = params;
    const { data: messages, error } = await supabase
      .from('incident_messages')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getIO } = require('@/lib/socket');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { message, sender_name } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const senderName = user?.name || sender_name || 'Anonymous';
    
    // Insert message with RETURNING to get full object
    const { data: msg, error: msgError } = await supabase
      .from('incident_messages')
      .insert({
        incident_id: id,
        user_id: user?.id || null,
        sender_name: senderName,
        message,
      })
      .select('*')
      .single();
    if (msgError) throw msgError;

    // Add timeline entry
    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: senderName,
      action: `Message: "${message.slice(0, 60)}"`,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    const { data: updatedIncident, error: incError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (incError) throw incError;

    const io = getIO();
    if (io) {
      io.to(id).emit('incident:message', msg);
      if (updatedIncident) io.emit('incident:updated', updatedIncident);
    }

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
