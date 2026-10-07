import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { SwiftpayConfig } from '@/lib/swiftpay';
import {
  getMerchantRedirectUrl,
  getSwiftpayConfig,
  getSwiftpayWebhookUrl,
  isSwiftpayCheckoutUrl,
  signSwiftpayFields,
} from '@/lib/swiftpay';

export const runtime = 'nodejs';

interface DepositPayload {
  amount?: unknown;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }
  const payload = rawPayload as DepositPayload;

  const amountText =
    typeof payload.amount === 'string' || typeof payload.amount === 'number'
      ? String(payload.amount)
      : '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    return NextResponse.json(
      { error: 'Deposit amount must use no more than two decimal places' },
      { status: 400 }
    );
  }

  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount < 100 || amount > 500_000) {
    return NextResponse.json(
      { error: 'PHP deposits must be between ₱100 and ₱500,000' },
      { status: 400 }
    );
  }

  let config: SwiftpayConfig;
  let webhookUrl: string;
  let redirectUrl: string;
  try {
    config = getSwiftpayConfig();
    webhookUrl = getSwiftpayWebhookUrl();
    const reference = `SWP-${randomUUID()}`;
    redirectUrl = getMerchantRedirectUrl(reference);

    const admin = createAdminClient();
    const [
      { data: depositSetting, error: settingError },
      { data: walletControl, error: walletError },
      { data: supportContact, error: supportError },
    ] = await Promise.all([
      admin
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'deposits_enabled')
        .maybeSingle(),
      admin.from('wallet_controls').select('is_frozen').eq('user_id', user.id).maybeSingle(),
      admin
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'support_email')
        .maybeSingle(),
    ]);

    if (settingError || walletError || supportError) {
      console.error(
        'Unable to verify wallet deposit eligibility',
        settingError?.code ?? walletError?.code ?? supportError?.code
      );
      return NextResponse.json({ error: 'Unable to verify wallet status' }, { status: 500 });
    }
    const supportEmail =
      typeof supportContact?.setting_value === 'string' ? supportContact.setting_value : '';
    if (depositSetting?.setting_value === false) {
      return NextResponse.json(
        {
          error: `Wallet deposits are temporarily disabled${supportEmail ? `. Contact ${supportEmail} for assistance.` : ''}`,
        },
        { status: 503 }
      );
    }
    if (walletControl?.is_frozen) {
      return NextResponse.json(
        {
          error: `This wallet is restricted.${supportEmail ? ` Contact ${supportEmail} for assistance.` : ' Contact support for assistance.'}`,
        },
        { status: 403 }
      );
    }

    const { error: insertError } = await admin.from('swiftpay_deposits').insert({
      user_id: user.id,
      reference_no: reference,
      amount: amount.toFixed(2),
      currency: 'PHP',
      status: 'PENDING',
    });

    if (insertError) {
      console.error('Unable to persist Swiftpay deposit intent', insertError.code);
      return NextResponse.json({ error: 'Unable to create deposit request' }, { status: 500 });
    }

    const signedAmount = amount.toFixed(2);
    const signedFields = {
      x_access_key: config.accessKey,
      x_amount: signedAmount,
      x_currency: 'PHP',
      x_reference_no: reference,
    };
    const signature = signSwiftpayFields(signedFields, config.secretKey);
    const details = JSON.stringify({ description: 'SwiftWallet PHP wallet deposit' });
    const requestBody =
      `{"x_access_key":${JSON.stringify(config.accessKey)},` +
      `"x_amount":${signedAmount},` +
      `"x_currency":"PHP",` +
      `"x_reference_no":${JSON.stringify(reference)},` +
      `"details":${JSON.stringify(details)},` +
      `"signature":${JSON.stringify(signature)},` +
      `"generate_customer_redirect_url":true,` +
      `"merchant_redirect_url":${JSON.stringify(redirectUrl)},` +
      `"merchant_webhook_url":${JSON.stringify(webhookUrl)}}`;

    let swiftpayResponse: Response;
    try {
      swiftpayResponse = await fetch(`${config.apiBaseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
    } catch (error) {
      console.error(
        'Swiftpay order request failed',
        error instanceof Error ? error.message : 'Unknown network error'
      );
      return NextResponse.json(
        {
          error: 'Unable to reach Swiftpay. Contact support with this reference before retrying.',
          reference,
          checkoutUncertain: true,
        },
        { status: 502 }
      );
    }

    if (swiftpayResponse.status !== 202) {
      const checkoutUncertain = swiftpayResponse.status >= 500;
      if (!checkoutUncertain) {
        const adminUpdate = await admin
          .from('swiftpay_deposits')
          .update({ status: 'FAILED' })
          .eq('reference_no', reference)
          .eq('user_id', user.id);
        if (adminUpdate.error) {
          console.error('Unable to mark rejected Swiftpay deposit', adminUpdate.error.code);
        }
      }

      console.error('Swiftpay rejected a deposit order', swiftpayResponse.status);
      return NextResponse.json(
        {
          error: checkoutUncertain
            ? 'Swiftpay could not confirm the request. Contact support with this reference before retrying.'
            : 'Swiftpay could not create the payment request. Please try again.',
          reference,
          checkoutUncertain,
        },
        { status: 502 }
      );
    }

    let responseBody: { customerRedirectUrl?: unknown };
    try {
      responseBody = (await swiftpayResponse.json()) as { customerRedirectUrl?: unknown };
    } catch {
      console.error('Swiftpay returned an invalid order response');
      return NextResponse.json(
        {
          error:
            'Swiftpay returned an invalid payment response. Contact support with this reference.',
          reference,
          checkoutUncertain: true,
        },
        { status: 502 }
      );
    }

    if (
      typeof responseBody.customerRedirectUrl !== 'string' ||
      !isSwiftpayCheckoutUrl(responseBody.customerRedirectUrl)
    ) {
      console.error('Swiftpay returned an invalid customer checkout URL');
      return NextResponse.json(
        {
          error: 'Swiftpay returned an invalid checkout link. Contact support with this reference.',
          reference,
          checkoutUncertain: true,
        },
        { status: 502 }
      );
    }

    const { error: updateError } = await admin
      .from('swiftpay_deposits')
      .update({ checkout_url: responseBody.customerRedirectUrl })
      .eq('reference_no', reference)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Unable to persist Swiftpay checkout URL', updateError.code);
      return NextResponse.json(
        {
          error: 'Payment was created but its status could not be saved. Contact support.',
          reference,
          checkoutUncertain: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference,
      customerRedirectUrl: responseBody.customerRedirectUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected integration error';
    console.error('Swiftpay deposit setup failed', message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
