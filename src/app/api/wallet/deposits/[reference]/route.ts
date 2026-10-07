import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ reference: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { reference } = await context.params;
  const { data, error } = await supabase
    .from('swiftpay_deposits')
    .select('reference_no, amount, currency, status, created_at')
    .eq('user_id', user.id)
    .eq('reference_no', reference)
    .maybeSingle();

  if (error) {
    console.error('Unable to read Swiftpay deposit status', error.code);
    return NextResponse.json({ error: 'Unable to load deposit status' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      reference: data.reference_no,
      amount: Number(data.amount),
      currency: data.currency,
      status: data.status,
      createdAt: data.created_at,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
