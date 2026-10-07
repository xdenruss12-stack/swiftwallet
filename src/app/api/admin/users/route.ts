import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context.status !== 200) {
    return NextResponse.json(
      {
        error:
          context.status === 401
            ? 'Authentication required'
            : context.status === 403
              ? 'Administrator access required'
              : 'Unable to verify administrator access',
      },
      { status: context.status }
    );
  }

  const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ error: 'Invalid user page' }, { status: 400 });
  }

  const { data, error } = await context.admin.auth.admin.listUsers({
    page,
    perPage: 50,
  });
  if (error) {
    console.error('Unable to list platform users', error.message);
    return NextResponse.json({ error: 'Unable to load users' }, { status: 500 });
  }

  return NextResponse.json(
    {
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        bannedUntil: user.banned_until ?? null,
      })),
      total: data.total ?? null,
      page,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if (context.status !== 200) {
    return NextResponse.json(
      {
        error:
          context.status === 401
            ? 'Authentication required'
            : context.status === 403
              ? 'Administrator access required'
              : 'Unable to verify administrator access',
      },
      { status: context.status }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const { userId, suspended } = payload as { userId?: unknown; suspended?: unknown };
  if (
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId) ||
    typeof suspended !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'A valid user ID and suspension status are required' },
      { status: 400 }
    );
  }
  if (userId === context.user.id) {
    return NextResponse.json(
      { error: 'You cannot suspend your own administrator account' },
      { status: 400 }
    );
  }

  const { data: administrator, error: administratorError } = await context.admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (administratorError) {
    console.error('Unable to verify target account role', administratorError.code);
    return NextResponse.json({ error: 'Unable to verify target account role' }, { status: 500 });
  }
  if (administrator) {
    return NextResponse.json(
      { error: 'Administrator accounts cannot be suspended from this console' },
      { status: 400 }
    );
  }

  const { data: target, error: targetError } = await context.admin.auth.admin.getUserById(userId);
  if (targetError || !target.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error: updateError } = await context.admin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? '876000h' : 'none',
  });
  if (updateError) {
    console.error('Unable to update user access', updateError.message);
    return NextResponse.json({ error: 'Unable to update user access' }, { status: 500 });
  }

  const { error: auditError } = await context.admin.rpc('admin_log_action', {
    p_actor_id: context.user.id,
    p_action: suspended ? 'user.suspended' : 'user.reactivated',
    p_target_type: 'user',
    p_target_id: userId,
    p_details: { email: target.user.email ?? null },
  });
  if (auditError) {
    console.error('User access changed but audit logging failed', auditError.code);
    return NextResponse.json(
      { error: 'User access changed, but the audit record could not be saved' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
