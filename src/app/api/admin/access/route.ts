import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
  const context = await getAdminContext();
  return NextResponse.json(
    { isAdmin: context.status === 200 },
    { status: context.status === 500 ? 500 : 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
