import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, zone_assignment, is_active, created_at')
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ users: users || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = require('@/lib/supabase');
    const bcrypt = require('bcrypt');
    const { email, password, name, role, zone_assignment } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'email, password, name, role required' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: hash,
        name,
        role,
        zone_assignment: zone_assignment || null,
      })
      .select('id, email, name, role, zone_assignment')
      .single();

    if (error) throw error;
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
