import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3');

    // Only return non-sensitive fields
    const sql = `
      SELECT id, type, zone, created_at
      FROM incidents
      WHERE status NOT IN ('resolved')
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const [result, countResult] = await Promise.all([
      query(sql, [limit]),
      query("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved')")
    ]);

    return NextResponse.json({ 
      incidents: result.rows,
      totalActive: parseInt(countResult.rows[0].c || '0')
    });
  } catch (err) {
    console.error('[GET /api/incidents/public] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch public incidents' }, { status: 500 });
  }
}
