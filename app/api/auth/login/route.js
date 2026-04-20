const { NextResponse } = require('next/server');

module.exports.POST = async function POST(request) {
  try {
    const db = require('@/lib/db');
    const bcrypt = require('bcrypt');
    const { generateToken } = require('@/lib/auth');
    
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = generateToken(user);
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, zone_assignment: user.zone_assignment },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
