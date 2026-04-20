const { NextResponse } = require('next/server');

// GET /api/export?format=json|csv — export all incident data
export async function GET(request) {
  try {
    const db = require('@/lib/db');
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const result = await db.query('SELECT * FROM incidents ORDER BY created_at DESC');
    const incidents = result.rows;

    if (format === 'csv') {
      const headers = Object.keys(incidents[0] || {}).join(',');
      const rows = incidents.map(inc =>
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

    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), incidents, count: incidents.length }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="crisislink-export-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
