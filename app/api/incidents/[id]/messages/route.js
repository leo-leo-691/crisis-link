const { NextResponse } = require('next/server');

export const dynamic = 'force-dynamic';

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

async function emitSafely(callback) {
  try {
    const { getIO } = require('@/lib/socket');
    const io = getIO();
    if (io) {
      await callback(io);
    }
  } catch (socketError) {
    console.error('[MESSAGES API] Socket emit failed:', socketError);
  }
}

export async function GET(request, { params }) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });

    const supabase = require('@/lib/supabase');
    const { id } = params;
    const { data: messages, error } = await supabase
      .from('incident_messages')
      .select('id, incident_id, user_id, sender_name, message, created_at')
      .eq('incident_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return jsonNoStore({ messages: messages || [] });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');

    const { id } = params;
    const user = getUserFromRequest(request);
    if (!user) return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    const { message, sender_name } = await request.json();
    if (!message) return jsonNoStore({ error: 'message required' }, { status: 400 });

    const senderName = user?.name || sender_name || 'Anonymous';
    const { data: msg, error: msgError } = await supabase
      .from('incident_messages')
      .insert({
        incident_id: id,
        user_id: user?.id || null,
        sender_name: senderName,
        message,
      })
      .select('id, incident_id, user_id, sender_name, message, created_at')
      .single();
    if (msgError) throw msgError;

    const { error: timeError } = await supabase.from('incident_timeline').insert({
      incident_id: id,
      actor: senderName,
      action: `Message: "${message.slice(0, 60)}"`,
      created_at: new Date().toISOString(),
    });
    if (timeError) throw timeError;

    await emitSafely(async (io) => {
      io.to(id).emit('incident:message', msg);
    });

    return jsonNoStore(msg, { status: 201 });
  } catch (err) {
    return jsonNoStore({ error: err.message }, { status: 500 });
  }
}
