import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Helper to verify the user making the request is an admin
async function verifyAdminCaller(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Missing Authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Invalid token', status: 401 };
  }

  // Check if the user is the super admin (admin@wedding.com)
  if (user.email !== 'admin@wedding.com') {
    return { error: 'Unauthorized: Only the super admin can manage users', status: 403 };
  }

  return { user };
}

// GET: List all users
export async function GET(request: Request) {
  try {
    const authCheck = await verifyAdminCaller(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users.users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request: Request) {
  try {
    const authCheck = await verifyAdminCaller(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: user.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update a user's password or role
export async function PUT(request: Request) {
  try {
    const authCheck = await verifyAdminCaller(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id, password, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (password) updateData.password = password;
    if (role) updateData.user_metadata = { role };

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: user.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a user
export async function DELETE(request: Request) {
  try {
    const authCheck = await verifyAdminCaller(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deleting the super admin
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(id);
    if (user.user?.email === 'admin@wedding.com') {
        return NextResponse.json({ error: 'Cannot delete the super admin account' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
