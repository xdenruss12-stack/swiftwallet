create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  setting_key text primary key check (
    setting_key in ('platform_name', 'support_email', 'deposits_enabled')
  ),
  setting_value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.platform_settings (setting_key, setting_value)
values
  ('platform_name', '"SwiftWallet"'::jsonb),
  ('support_email', '""'::jsonb),
  ('deposits_enabled', 'true'::jsonb)
on conflict (setting_key) do nothing;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  business_name text not null check (length(trim(business_name)) between 2 and 120),
  business_type text not null default 'other'
    check (business_type in ('retail', 'ecommerce', 'services', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchants_status_created_idx
  on public.merchants (status, created_at desc);

create table if not exists public.wallet_controls (
  user_id uuid primary key references auth.users(id) on delete restrict,
  is_frozen boolean not null default false,
  reason text check (reason is null or length(reason) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.platform_admins enable row level security;
alter table public.platform_settings enable row level security;
alter table public.merchants enable row level security;
alter table public.wallet_controls enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.platform_admins, public.platform_settings, public.merchants,
  public.wallet_controls, public.admin_audit_log from public, anon, authenticated;
grant all on public.platform_admins, public.platform_settings, public.merchants,
  public.wallet_controls, public.admin_audit_log to service_role;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;

create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.platform_admins where user_id = p_user_id
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_platform_admin(uuid) to service_role;

create or replace function public.admin_get_overview(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  select jsonb_build_object(
    'user_count', (select count(*) from auth.users),
    'merchant_count', (select count(*) from public.merchants),
    'active_merchant_count', (select count(*) from public.merchants where status = 'active'),
    'frozen_wallet_count', (select count(*) from public.wallet_controls where is_frozen),
    'wallet_balance_php', coalesce((
      select sum(amount) from public.wallet_ledger_entries where currency = 'PHP'
    ), 0),
    'wallets', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at desc)
      from (
        select users.id as user_id, users.email, users.created_at,
          coalesce(ledger.balance, 0) as balance_php,
          coalesce(controls.is_frozen, false) as is_frozen,
          controls.reason as freeze_reason
        from auth.users as users
        left join lateral (
          select sum(entries.amount) as balance
          from public.wallet_ledger_entries as entries
          where entries.user_id = users.id and entries.currency = 'PHP'
        ) as ledger on true
        left join public.wallet_controls as controls on controls.user_id = users.id
        order by users.created_at desc
        limit 100
      ) as w
    ), '[]'::jsonb),
    'pending_deposit_count', (select count(*) from public.swiftpay_deposits where status = 'PENDING'),
    'pending_deposit_total_php', coalesce((
      select sum(amount) from public.swiftpay_deposits where status = 'PENDING'
    ), 0),
    'deposits', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.created_at desc)
      from (
        select deposits.id, deposits.reference_no, deposits.user_id,
          users.email, deposits.amount, deposits.currency, deposits.status,
          deposits.created_at, deposits.updated_at, deposits.paid_at
        from public.swiftpay_deposits as deposits
        join auth.users as users on users.id = deposits.user_id
        order by deposits.created_at desc
        limit 100
      ) as d
    ), '[]'::jsonb),
    'merchants', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at desc)
      from (
        select merchants.id, merchants.user_id, users.email, merchants.business_name,
          merchants.business_type, merchants.status, merchants.created_at, merchants.updated_at
        from public.merchants
        join auth.users as users on users.id = merchants.user_id
        order by merchants.created_at desc
        limit 100
      ) as m
    ), '[]'::jsonb),
    'settings', coalesce((
      select jsonb_object_agg(setting_key, setting_value)
      from public.platform_settings
    ), '{}'::jsonb),
    'audit_log', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (
        select log.id, log.actor_id, actor.email as actor_email, log.action,
          log.target_type, log.target_id, log.details, log.created_at
        from public.admin_audit_log as log
        join auth.users as actor on actor.id = log.actor_id
        order by log.created_at desc
        limit 100
      ) as a
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_set_setting(
  p_actor_id uuid,
  p_key text,
  p_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if p_key not in ('platform_name', 'support_email', 'deposits_enabled') then
    raise exception using errcode = '22023', message = 'Unsupported platform setting';
  end if;
  if p_key = 'deposits_enabled' and jsonb_typeof(p_value) <> 'boolean' then
    raise exception using errcode = '22023', message = 'Setting value must be a boolean';
  end if;
  if p_key in ('platform_name', 'support_email') and jsonb_typeof(p_value) <> 'string' then
    raise exception using errcode = '22023', message = 'Setting value must be a string';
  end if;
  if p_key = 'platform_name' and length(trim(p_value #>> '{}')) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Platform name must be 2 to 80 characters';
  end if;
  if p_key = 'support_email' and length(p_value #>> '{}') > 254 then
    raise exception using errcode = '22023', message = 'Support email is too long';
  end if;

  insert into public.platform_settings (setting_key, setting_value, updated_at, updated_by)
  values (p_key, p_value, now(), p_actor_id)
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'setting.updated', 'platform_setting', p_key,
    jsonb_build_object('value', p_value));
end;
$$;

create or replace function public.admin_set_wallet_frozen(
  p_actor_id uuid,
  p_user_id uuid,
  p_is_frozen boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if p_actor_id = p_user_id then
    raise exception using errcode = '22023', message = 'Administrators cannot freeze their own wallet';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = '22023', message = 'User not found';
  end if;
  if p_is_frozen and (p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 500) then
    raise exception using errcode = '22023', message = 'A freeze reason of 3 to 500 characters is required';
  end if;

  insert into public.wallet_controls (user_id, is_frozen, reason, updated_at, updated_by)
  values (p_user_id, p_is_frozen, case when p_is_frozen then trim(p_reason) else null end, now(), p_actor_id)
  on conflict (user_id) do update
    set is_frozen = excluded.is_frozen,
        reason = excluded.reason,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, case when p_is_frozen then 'wallet.frozen' else 'wallet.unfrozen' end,
    'wallet', p_user_id::text, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_create_merchant(
  p_actor_id uuid,
  p_user_id uuid,
  p_business_name text,
  p_business_type text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  merchant_id uuid;
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if length(trim(p_business_name)) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Business name must be 2 to 120 characters';
  end if;
  if p_business_type not in ('retail', 'ecommerce', 'services', 'other') then
    raise exception using errcode = '22023', message = 'Unsupported business type';
  end if;

  insert into public.merchants (user_id, business_name, business_type)
  values (p_user_id, trim(p_business_name), p_business_type)
  returning id into merchant_id;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'merchant.created', 'merchant', merchant_id::text,
    jsonb_build_object('user_id', p_user_id, 'business_name', trim(p_business_name)));

  return merchant_id;
end;
$$;

create or replace function public.admin_set_merchant_status(
  p_actor_id uuid,
  p_merchant_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  merchant_row public.merchants%rowtype;
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if p_status not in ('pending', 'active', 'suspended') then
    raise exception using errcode = '22023', message = 'Unsupported merchant status';
  end if;

  update public.merchants
    set status = p_status, updated_at = now()
    where id = p_merchant_id
    returning * into merchant_row;
  if not found then
    raise exception using errcode = '22023', message = 'Merchant not found';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, 'merchant.status_changed', 'merchant', p_merchant_id::text,
    jsonb_build_object('status', p_status, 'user_id', merchant_row.user_id));
end;
$$;

create or replace function public.admin_log_action(
  p_actor_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin(p_actor_id) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (p_actor_id, p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.is_wallet_frozen(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select is_frozen from public.wallet_controls where user_id = p_user_id
  ), false);
$$;

revoke all on function public.admin_get_overview(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_setting(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_set_wallet_frozen(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_create_merchant(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_merchant_status(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_log_action(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.is_wallet_frozen(uuid) from public, anon, authenticated;

grant execute on function public.admin_get_overview(uuid) to service_role;
grant execute on function public.admin_set_setting(uuid, text, jsonb) to service_role;
grant execute on function public.admin_set_wallet_frozen(uuid, uuid, boolean, text) to service_role;
grant execute on function public.admin_create_merchant(uuid, uuid, text, text) to service_role;
grant execute on function public.admin_set_merchant_status(uuid, uuid, text) to service_role;
grant execute on function public.admin_log_action(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.is_wallet_frozen(uuid) to service_role;
