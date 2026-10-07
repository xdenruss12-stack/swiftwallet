import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['platform_name', 'support_email']);

  if (error) {
    console.error('Unable to load public platform configuration', error.code);
    return NextResponse.json({ error: 'Unable to load platform configuration' }, { status: 500 });
  }

  const settings = new Map(data.map((entry) => [entry.setting_key, entry.setting_value]));
  const platformName = settings.get('platform_name');
  const supportEmail = settings.get('support_email');
  return NextResponse.json(
    {
      platformName: typeof platformName === 'string' ? platformName : 'SwiftWallet',
      supportEmail: typeof supportEmail === 'string' ? supportEmail : '',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
