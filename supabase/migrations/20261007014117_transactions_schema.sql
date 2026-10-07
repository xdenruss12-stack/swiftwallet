-- ============================================================
-- SwiftPay Transactions Schema
-- Module: transactions (deposits, withdrawals, transfers)
-- ============================================================

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.tx_type CASCADE;
CREATE TYPE public.tx_type AS ENUM ('deposit', 'withdrawal', 'send', 'receive', 'buy', 'topup', 'fee');

DROP TYPE IF EXISTS public.tx_status CASCADE;
CREATE TYPE public.tx_status AS ENUM ('completed', 'pending', 'processing', 'failed');

DROP TYPE IF EXISTS public.tx_direction CASCADE;
CREATE TYPE public.tx_direction AS ENUM ('in', 'out');

DROP TYPE IF EXISTS public.currency_code CASCADE;
CREATE TYPE public.currency_code AS ENUM ('PHP', 'KRW', 'USDT');

-- 2. USER PROFILES TABLE (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tx_type public.tx_type NOT NULL,
  currency public.currency_code NOT NULL,
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  direction public.tx_direction NOT NULL,
  tx_status public.tx_status NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT '',
  fee NUMERIC(20, 8) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_status ON public.transactions(tx_status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_type ON public.transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON public.transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);

-- 5. FUNCTIONS (must be before RLS policies)

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Handle new user creation from auth trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- user_profiles: users manage their own profile
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- transactions: users can view their own transactions
DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions;
CREATE POLICY "users_select_own_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- transactions: users can insert their own transactions
DROP POLICY IF EXISTS "users_insert_own_transactions" ON public.transactions;
CREATE POLICY "users_insert_own_transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- transactions: users can update their own transactions
DROP POLICY IF EXISTS "users_update_own_transactions" ON public.transactions;
CREATE POLICY "users_update_own_transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- transactions: users can delete their own transactions
DROP POLICY IF EXISTS "users_delete_own_transactions" ON public.transactions;
CREATE POLICY "users_delete_own_transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 8. TRIGGERS

-- Auto-update updated_at on user_profiles
DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-update updated_at on transactions
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create user_profiles row when new auth user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. MOCK DATA (safe, idempotent)
DO $$
DECLARE
  demo_user_uuid UUID := gen_random_uuid();
BEGIN
  -- Create a demo auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    demo_user_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo@swiftpay.com',
    crypt('demo1234', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Demo User', 'avatar_url', ''),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert sample transactions for demo user (trigger creates user_profiles)
  INSERT INTO public.transactions (id, user_id, tx_type, currency, amount, direction, tx_status, description, reference, channel, fee)
  VALUES
    (gen_random_uuid(), demo_user_uuid, 'deposit',    'PHP',  15000,  'in',  'pending',    'BDO Bank Deposit',          'DEP-20261006-0182', 'PHP_BANK_TRANSFER', 0),
    (gen_random_uuid(), demo_user_uuid, 'deposit',    'KRW',  500000, 'in',  'completed',  'KB Bank Transfer',          'DEP-20261005-0177', 'KRW_BANK_TRANSFER', 0),
    (gen_random_uuid(), demo_user_uuid, 'withdrawal', 'PHP',  8500,   'out', 'completed',  'BPI Withdrawal',            'WIT-20261005-0091', 'PHP_BANK_TRANSFER', 25),
    (gen_random_uuid(), demo_user_uuid, 'send',       'USDT', 150,    'out', 'completed',  'USDT Send via Binance',     'SND-20261004-0055', 'USDT_BINANCE',      1.5),
    (gen_random_uuid(), demo_user_uuid, 'withdrawal', 'KRW',  250000, 'out', 'processing', 'Shinhan Bank Withdrawal',   'WIT-20261004-0088', 'KRW_BANK_TRANSFER', 500),
    (gen_random_uuid(), demo_user_uuid, 'topup',      'USDT', 300,    'in',  'completed',  'Top Up via Trust Wallet',   'TOP-20261003-0044', 'USDT_TRUST_WALLET', 2),
    (gen_random_uuid(), demo_user_uuid, 'deposit',    'PHP',  25000,  'in',  'completed',  'GCash Deposit',             'DEP-20261002-0163', 'PHP_GCASH',         0),
    (gen_random_uuid(), demo_user_uuid, 'buy',        'USDT', 200,    'in',  'completed',  'Buy USDT via OKX',          'BUY-20261001-0033', 'USDT_OKX',          2.5),
    (gen_random_uuid(), demo_user_uuid, 'deposit',    'KRW',  800000, 'in',  'completed',  'Woori Bank Deposit',        'DEP-20260930-0159', 'KRW_BANK_TRANSFER', 0),
    (gen_random_uuid(), demo_user_uuid, 'withdrawal', 'PHP',  12000,  'out', 'failed',     'Metrobank Withdrawal',      'WIT-20260929-0082', 'PHP_BANK_TRANSFER', 0),
    (gen_random_uuid(), demo_user_uuid, 'send',       'USDT', 75.5,   'out', 'completed',  'USDT Send via MetaMask',    'SND-20260928-0049', 'USDT_METAMASK',     0.8),
    (gen_random_uuid(), demo_user_uuid, 'topup',      'USDT', 500,    'in',  'completed',  'Top Up via Binance',        'TOP-20260927-0039', 'USDT_BINANCE',      3)
  ON CONFLICT (reference) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
