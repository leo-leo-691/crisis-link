const { NextResponse } = require('next/server');

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const db = require('@/lib/db');

    const decoded = getUserFromRequest(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db.query('SELECT id, email, name, role, zone_assignment FROM users WHERE id = $1 AND is_active = TRUE', [decoded.id]);
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
