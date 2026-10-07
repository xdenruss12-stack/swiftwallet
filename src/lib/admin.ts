import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, admin: null, status: 401 as const };
  }

  const admin = createAdminClient();
  const { data: isAdmin, error } = await admin.rpc('is_platform_admin', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Unable to verify platform administrator access', error.code);
    return { user, admin: null, status: 500 as const };
  }
  if (!isAdmin) {
    return { user, admin: null, status: 403 as const };
  }

  return { user, admin, status: 200 as const };
}
