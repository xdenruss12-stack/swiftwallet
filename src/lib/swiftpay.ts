import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SwiftpayConfig {
  accessKey: string;
  secretKey: string;
  apiBaseUrl: string;
  environment: 'sandbox' | 'production';
}

export function getSwiftpayConfig(): SwiftpayConfig {
  const accessKey = process.env.SWIFTPAY_ACCESS_KEY;
  const secretKey = process.env.SWIFTPAY_SECRET_KEY;
  const environment = process.env.SWIFTPAY_ENVIRONMENT ?? 'sandbox';

  if (!accessKey || accessKey.length !== 32 || !secretKey) {
    throw new Error('Swiftpay merchant credentials are not configured');
  }

  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error('SWIFTPAY_ENVIRONMENT must be sandbox or production');
  }

  return {
    accessKey,
    secretKey,
    environment,
    apiBaseUrl:
      environment === 'production'
        ? 'https://api.pay.live.swiftpay.ph'
        : 'https://api.pay.sandbox.live.swiftpay.ph',
  };
}

export function signSwiftpayFields(fields: Record<string, string>, secretKey: string): string {
  const canonicalPayload = Object.entries(fields)
    .filter(([key, value]) => key.startsWith('x_') && value !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}${value}`)
    .join('');

  return createHmac('sha256', secretKey).update(canonicalPayload, 'utf8').digest('hex');
}

export function verifySwiftpaySignature(
  params: URLSearchParams,
  secretKey: string
): Record<string, string> | null {
  const fields: Record<string, string> = {};
  let signature: string | null = null;

  for (const [key, value] of params.entries()) {
    if (key === 'signature') {
      if (signature !== null) return null;
      signature = value;
      continue;
    }

    if (!key.startsWith('x_')) continue;
    if (Object.prototype.hasOwnProperty.call(fields, key)) return null;
    fields[key] = value;
  }

  if (!signature || !/^[a-f\d]{64}$/i.test(signature)) return null;

  const expected = Buffer.from(signSwiftpayFields(fields, secretKey), 'hex');
  const received = Buffer.from(signature, 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  return fields;
}

export function getSwiftpayWebhookUrl(): string {
  const webhookUrl = process.env.SWIFTPAY_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('SWIFTPAY_WEBHOOK_URL is not configured');

  const parsedUrl = new URL(webhookUrl);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('SWIFTPAY_WEBHOOK_URL must use HTTPS');
  }
  return parsedUrl.toString();
}

export function getMerchantRedirectUrl(reference: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not configured');

  const parsedUrl = new URL(siteUrl);
  if (
    parsedUrl.protocol !== 'https:' &&
    !(parsedUrl.protocol === 'http:' && parsedUrl.hostname === 'localhost')
  ) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS');
  }

  parsedUrl.pathname = '/deposit-wizard';
  parsedUrl.search = new URLSearchParams({ reference }).toString();
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

export function isSwiftpayCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['pay.swiftpay.ph', 'pay.sandbox.live.swiftpay.ph'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
