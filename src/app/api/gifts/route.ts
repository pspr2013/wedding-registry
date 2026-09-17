import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS, we will enforce auth checks manually
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email || "";
    const userRole = user.user_metadata?.role;

    // Only allow super admin or users with admin role
    if (userEmail !== "admin@wedding.com" && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all gifts
    const { data: gifts, error: giftsError } = await supabaseAdmin
      .from("gifts")
      .select("*")
      .order("created_at", { ascending: false });

    if (giftsError) {
      return NextResponse.json({ error: giftsError.message }, { status: 500 });
    }

    return NextResponse.json({ gifts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email || "";
    const userRole = user.user_metadata?.role;

    if (userEmail !== "admin@wedding.com" && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, amount_usd, amount_khr, transfer_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    let updatePayload: any = {};
    if (status !== undefined) updatePayload.status = status;
    if (amount_usd !== undefined) updatePayload.amount_usd = amount_usd;
    if (amount_khr !== undefined) updatePayload.amount_khr = amount_khr;
    if (transfer_date !== undefined) updatePayload.transfer_date = transfer_date;

    const { error: updateError } = await supabaseAdmin
      .from("gifts")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
