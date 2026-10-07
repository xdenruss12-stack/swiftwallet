import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

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
  const { key, value } = payload as { key?: unknown; value?: unknown };
  const validKey = ['platform_name', 'support_email', 'deposits_enabled'].includes(String(key));
  const validValue = typeof value === 'string' || typeof value === 'boolean';
  if (!validKey || !validValue) {
    return NextResponse.json({ error: 'Unsupported setting or invalid value' }, { status: 400 });
  }
  if (
    key === 'support_email' &&
    typeof value === 'string' &&
    value !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    return NextResponse.json({ error: 'Enter a valid support email address' }, { status: 400 });
  }

  const { error } = await context.admin.rpc('admin_set_setting', {
    p_actor_id: context.user.id,
    p_key: key,
    p_value: value,
  });
  if (error) {
    console.error('Unable to update platform setting', error.code);
    return NextResponse.json({ error: 'Unable to update platform setting' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
