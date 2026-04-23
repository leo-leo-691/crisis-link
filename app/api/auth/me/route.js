const { NextResponse } = require('next/server');

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const supabase = require('@/lib/supabase');

    const decoded = getUserFromRequest(request);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, zone_assignment')
      .eq('id', decoded.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
