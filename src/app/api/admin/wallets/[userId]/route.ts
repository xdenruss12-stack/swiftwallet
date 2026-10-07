import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
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
  const { frozen, reason } = payload as { frozen?: unknown; reason?: unknown };
  if (typeof frozen !== 'boolean' || (frozen && typeof reason !== 'string')) {
    return NextResponse.json({ error: 'Freeze status and a reason are required' }, { status: 400 });
  }

  const { error } = await context.admin.rpc('admin_set_wallet_frozen', {
    p_actor_id: context.user.id,
    p_user_id: userId,
    p_is_frozen: frozen,
    p_reason: typeof reason === 'string' ? reason : null,
  });
  if (error) {
    console.error('Unable to update wallet controls', error.code);
    return NextResponse.json({ error: 'Unable to update wallet controls' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
