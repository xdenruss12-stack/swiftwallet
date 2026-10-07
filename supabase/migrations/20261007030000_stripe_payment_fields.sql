-- Add Stripe payment fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent_id ON public.transactions(payment_intent_id);
