import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('get_php_wallet_summary');
  const summary = Array.isArray(data) ? data[0] : null;

  if (error || !summary) {
    console.error('Unable to load wallet summary', error?.code ?? 'empty summary');
    return NextResponse.json({ error: 'Unable to load wallet summary' }, { status: 500 });
  }

  return NextResponse.json(
    {
      currency: 'PHP',
      balance: Number(summary.balance),
      monthlyIn: Number(summary.monthly_in),
      monthlyOut: 0,
      pendingIn: Number(summary.pending_in),
      pendingOut: 0,
      updatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
