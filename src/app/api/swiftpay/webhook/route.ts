import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSwiftpayConfig, verifySwiftpaySignature } from '@/lib/swiftpay';

export const runtime = 'nodejs';

const PAYMENT_STATUSES = new Set(['EXECUTED', 'REJECTED', 'CANCELED', 'EXPIRED']);

export async function POST(request: NextRequest) {
  let config;
  try {
    config = getSwiftpayConfig();
  } catch (error) {
    console.error(
      'Swiftpay webhook is not configured',
      error instanceof Error ? error.message : 'Unknown configuration error'
    );
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
  }

  const fields = verifySwiftpaySignature(request.nextUrl.searchParams, config.secretKey);
  if (!fields) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  if (fields.x_access_key && fields.x_access_key !== config.accessKey) {
    return NextResponse.json({ error: 'Invalid merchant access key' }, { status: 401 });
  }

  const reference = fields.x_reference_no;
  const paymentId = fields.x_payment_id;
  const paymentStatus = fields.x_payment_status;
  if (!reference || !paymentId || !paymentStatus || !PAYMENT_STATUSES.has(paymentStatus)) {
    return NextResponse.json({ error: 'Invalid payment notification' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc('apply_swiftpay_webhook', {
      p_reference_no: reference,
      p_payment_id: paymentId,
      p_payment_status: paymentStatus,
    });

    if (error) {
      console.error('Unable to apply Swiftpay payment notification', error.code);
      return NextResponse.json(
        { error: 'Unable to process payment notification' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      'Swiftpay webhook processing failed',
      error instanceof Error ? error.message : 'Unknown processing error'
    );
    return NextResponse.json({ error: 'Unable to process payment notification' }, { status: 500 });
  }
}
