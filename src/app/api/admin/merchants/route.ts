import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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
  const { userId, businessName, businessType } = payload as {
    userId?: unknown;
    businessName?: unknown;
    businessType?: unknown;
  };
  if (
    typeof userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(userId) ||
    typeof businessName !== 'string' ||
    typeof businessType !== 'string'
  ) {
    return NextResponse.json(
      { error: 'A valid account, business name, and business type are required' },
      { status: 400 }
    );
  }

  const { data: merchantId, error } = await context.admin.rpc('admin_create_merchant', {
    p_actor_id: context.user.id,
    p_user_id: userId,
    p_business_name: businessName,
    p_business_type: businessType,
  });
  if (error) {
    console.error('Unable to create merchant', error.code);
    return NextResponse.json(
      { error: 'Unable to create merchant; verify the account and business details' },
      { status: 400 }
    );
  }
  return NextResponse.json({ id: merchantId }, { status: 201 });
}
