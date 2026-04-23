import { NextResponse } from 'next/server';
import crypto from 'crypto';

const { MOCK_SCENARIOS } = require('@/lib/mockAI');
const { logAudit } = require('@/lib/auditLogger');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = require('@/lib/supabase');
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
    const { error: incError } = await supabase.from('incidents').insert({
      id,
      type: 'Fire',
      description,
      severity: triageData.severity,
      zone: 'Kitchen Zone',
      reporter_name: 'SimRunner',
      reporter_type: 'staff',
      status: 'reported',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (incError) throw incError;

    if (triageData.actions) {
      const { error: taskError } = await supabase.from('incident_tasks').insert(
        triageData.actions.map((action) => ({ incident_id: id, title: action, priority: 'high' }))
      );
      if (taskError) throw taskError;
    }

    const { data: incident, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    logAudit('CREATE_SIMULATION', 'incident', id);

    // Simulated flow over websockets
    const io = (require('@/lib/socket')).getIO();
    if (io) {
      io.emit('incident:updated', incident);
      io.emit('broadcast', { message: `DEMO STARTED: Kitchen Fire`, target_role: 'all', timestamp: new Date().toISOString() });
      
      // Delay Assignment update
      setTimeout(async () => {
        try {
          await supabase.from('incidents').update({ status: 'acknowledged', updated_at: new Date().toISOString() }).eq('id', id);
          const { data: updated } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
          io.emit('incident:updated', updated);
          logAudit('SCENARIO_RUNNER', 'incident', id, { status: "acknowledged" });
          
          // Delay resolved update
          setTimeout(async () => {
             try {
                await supabase.from('incidents').update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
                const { data: final } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
                io.emit('incident:updated', final);
                io.emit('broadcast', { message: 'Demo scenario resolved successfully.', target_role: 'all', timestamp: new Date().toISOString() });
                logAudit('SCENARIO_RUNNER', 'incident', id, { status: "resolved" });
             } catch (e) { console.error('Sim resolution error', e); }
          }, 2000);
        } catch (e) { console.error('Sim ack error', e); }
      }, 1500);
    }
    
    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error) {
    console.error('Demo Engine Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
