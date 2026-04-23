const { NextResponse } = require('next/server');

export async function GET() {
  try {
    const db = require('@/lib/db');
    const result = await db.query(`
      SELECT z.*, 
             (SELECT COUNT(*) 
              FROM incidents i 
              WHERE i.zone = z.name 
              AND i.status NOT IN ('resolved')) as active_incidents
      FROM venue_zones z
      ORDER BY z.floor ASC, z.name ASC
    `);

    return NextResponse.json({ zones: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');
    const body = await request.json();
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });

    const result = await db.query(
      'INSERT INTO venue_zones (name, floor) VALUES ($1, $2) RETURNING *',
      [name, 1]
    );
    return NextResponse.json({ zone: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const zoneId = Number(searchParams.get('id'));
    if (!zoneId) return NextResponse.json({ error: 'Zone id is required' }, { status: 400 });

    await db.query('DELETE FROM venue_zones WHERE id = $1', [zoneId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
