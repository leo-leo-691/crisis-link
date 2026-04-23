const { NextResponse } = require('next/server');

// GET /api/export?format=json|csv — export all incident data
export async function GET(request) {
  try {
    const supabase = require('@/lib/supabase');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (format === 'csv') {
      const safeIncidents = incidents || [];
      const headers = Object.keys(safeIncidents[0] || {}).join(',');
      const rows = safeIncidents.map(inc =>
        Object.values(inc).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const csv = `${headers}\n${rows}`;
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="crisislink-export-${Date.now()}.csv"`,
        },
      });
    }

    const safeIncidents = incidents || [];
    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), incidents: safeIncidents, count: safeIncidents.length }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="crisislink-export-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
