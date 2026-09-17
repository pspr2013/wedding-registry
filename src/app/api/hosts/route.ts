import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter users who are hosts (either by metadata role or email)
    const hosts = users.users
      .filter(user => user.user_metadata?.role === 'host' || (!user.user_metadata?.role && user.email?.includes('host')))
      .map(user => ({ email: user.email }));

    return NextResponse.json({ hosts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
