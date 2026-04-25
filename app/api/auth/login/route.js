import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/auth';
import { logEvent } from '@/lib/gcpLogger';
 
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
 
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle();
 
    if (error) throw error;
    
    if (!user) {
      logEvent('WARNING', `Failed login attempt for email: ${email}`, { ip });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
 
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logEvent('WARNING', `Failed login attempt for user: ${user.email}`, { ip, userId: user.id });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
 
    logEvent('INFO', `Successful login: ${user.email}`, { ip, userId: user.id, role: user.role });
    const token = generateToken(user);
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, zone_assignment: user.zone_assignment },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    logEvent('ERROR', `Critical login failure: ${err.message}`, { ip });
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
  }
}

