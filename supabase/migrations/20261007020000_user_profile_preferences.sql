-- ============================================================
-- SwiftPay User Profile Preferences & Security Settings
-- Module: user_profiles (preferences, 2FA, phone)
-- ============================================================

-- Add preference columns to user_profiles (idempotent)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT '';

-- Index for language/currency lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_currency ON public.user_profiles(preferred_currency);
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_language ON public.user_profiles(preferred_language);
