import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
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

  const { data, error } = await context.admin.rpc('admin_get_overview', {
    p_actor_id: context.user.id,
  });
  if (error) {
    console.error('Unable to load administration overview', error.code);
    return NextResponse.json({ error: 'Unable to load administration data' }, { status: 500 });
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
