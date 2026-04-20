const { NextResponse } = require('next/server');

module.exports.GET = async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const db = require('@/lib/db');

    const decoded = getUserFromRequest(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = db.prepare('SELECT id, email, name, role, zone_assignment FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
