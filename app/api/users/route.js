import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');
    const result = await db.query('SELECT id, email, name, role, zone_assignment, is_active, created_at FROM users ORDER BY role, name');
    return NextResponse.json({ users: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = require('@/lib/db');
    const bcrypt = require('bcrypt');
    const { email, password, name, role, zone_assignment } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'email, password, name, role required' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, name, role, zone_assignment) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, zone_assignment',
      [email.toLowerCase().trim(), hash, name, role, zone_assignment || null]
    );
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
