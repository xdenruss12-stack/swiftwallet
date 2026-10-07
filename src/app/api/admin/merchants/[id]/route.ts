import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid merchant ID' }, { status: 400 });
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
  const { status } = payload as { status?: unknown };
  if (!['pending', 'active', 'suspended'].includes(String(status))) {
    return NextResponse.json({ error: 'Invalid merchant status' }, { status: 400 });
  }

  const { error } = await context.admin.rpc('admin_set_merchant_status', {
    p_actor_id: context.user.id,
    p_merchant_id: id,
    p_status: status,
  });
  if (error) {
    console.error('Unable to update merchant status', error.code);
    return NextResponse.json({ error: 'Unable to update merchant status' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
