create table if not exists public.swiftpay_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  reference_no text not null unique,
  swiftpay_payment_id text unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency = 'PHP'),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PAID', 'REJECTED', 'CANCELED', 'EXPIRED', 'FAILED')),
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists swiftpay_deposits_user_created_idx
  on public.swiftpay_deposits (user_id, created_at desc);

alter table public.swiftpay_deposits enable row level security;

create policy "Users can read their own Swiftpay deposits"
  on public.swiftpay_deposits
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  deposit_id uuid unique references public.swiftpay_deposits(id) on delete restrict,
  currency text not null check (currency = 'PHP'),
  entry_type text not null check (entry_type = 'deposit'),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_entries_user_created_idx
  on public.wallet_ledger_entries (user_id, created_at desc);

alter table public.wallet_ledger_entries enable row level security;

create policy "Users can read their own wallet ledger entries"
  on public.wallet_ledger_entries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_php_wallet_summary()
returns table (balance numeric, monthly_in numeric, pending_in numeric)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    coalesce(sum(entries.amount), 0),
    coalesce(
      sum(entries.amount) filter (
        where entries.amount > 0
          and entries.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
      ),
      0
    ),
    coalesce((
      select sum(deposits.amount)
      from public.swiftpay_deposits as deposits
      where deposits.user_id = (select auth.uid())
        and deposits.currency = 'PHP'
        and deposits.status = 'PENDING'
    ), 0)
  from public.wallet_ledger_entries as entries
  where entries.user_id = (select auth.uid())
    and entries.currency = 'PHP';
$$;

revoke all on function public.get_php_wallet_summary() from public, anon;
grant execute on function public.get_php_wallet_summary() to authenticated;

create or replace function public.apply_swiftpay_webhook(
  p_reference_no text,
  p_payment_id text,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deposit_row public.swiftpay_deposits%rowtype;
  next_status text;
begin
  if p_payment_status not in ('EXECUTED', 'REJECTED', 'CANCELED', 'EXPIRED') then
    raise exception 'Unsupported Swiftpay payment status';
  end if;

  select *
    into deposit_row
    from public.swiftpay_deposits
    where reference_no = p_reference_no
    for update;

  if not found then
    raise exception 'Swiftpay deposit reference not found';
  end if;

  if deposit_row.swiftpay_payment_id is not null
     and deposit_row.swiftpay_payment_id <> p_payment_id then
    raise exception 'Swiftpay payment ID does not match deposit';
  end if;

  if deposit_row.status <> 'PENDING' then
    if deposit_row.status = 'PAID' and p_payment_status = 'EXECUTED' then
      return;
    end if;
    if deposit_row.status = p_payment_status then
      return;
    end if;
    raise exception 'Swiftpay deposit is already terminal';
  end if;

  next_status := case p_payment_status
    when 'EXECUTED' then 'PAID'
    else p_payment_status
  end;

  update public.swiftpay_deposits
    set status = next_status,
        swiftpay_payment_id = p_payment_id,
        updated_at = now(),
        paid_at = case when p_payment_status = 'EXECUTED' then now() else null end
    where id = deposit_row.id;

  if p_payment_status = 'EXECUTED' then
    insert into public.wallet_ledger_entries (
      user_id,
      deposit_id,
      currency,
      entry_type,
      amount
    )
    values (
      deposit_row.user_id,
      deposit_row.id,
      deposit_row.currency,
      'deposit',
      deposit_row.amount
    )
    on conflict (deposit_id) do nothing;
  end if;
end;
$$;

revoke all on function public.apply_swiftpay_webhook(text, text, text) from public, anon, authenticated;
grant execute on function public.apply_swiftpay_webhook(text, text, text) to service_role;
