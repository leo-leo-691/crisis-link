import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    const db = require('@/lib/db');
    const payload = await request.json();

    const updates = [];
    const values = [];
    let index = 1;

    const allowed = ['name', 'email', 'role', 'zone_assignment', 'is_active'];
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updates.push(`${key} = $${index++}`);
        values.push(key === 'email' ? String(payload[key]).toLowerCase().trim() : payload[key]);
      }
    }

    if (payload.password) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(payload.password, 10);
      updates.push(`password_hash = $${index++}`);
      values.push(hash);
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, email, name, role, zone_assignment, is_active, created_at`,
      values
    );

    if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
