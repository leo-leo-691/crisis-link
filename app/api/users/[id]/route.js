import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    const supabase = require('@/lib/supabase');
    const payload = await request.json();

    const allowed = ['name', 'email', 'role', 'zone_assignment', 'is_active'];
    const updates = {};
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updates[key] = key === 'email'
          ? String(payload[key]).toLowerCase().trim()
          : payload[key];
      }
    }

    if (payload.password) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(payload.password, 10);
      updates.password_hash = hash;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', Number(id))
      .select('id, email, name, role, zone_assignment, is_active, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
