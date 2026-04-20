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
