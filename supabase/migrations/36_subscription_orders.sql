-- ─────────────────────────────────────────────────────────
-- Migration 36: Manual PromptPay + admin approval subscription orders
-- Flow: user picks package → QR + slip upload → Slip2Go auto-verify OR admin approval
-- ─────────────────────────────────────────────────────────

create table if not exists subscription_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_ref text unique not null,
  plan_code text not null references subscription_plans(code),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  amount_thb numeric not null,
  duration_days int not null default 30,
  promptpay_qr_payload text,
  slip_url text,
  slip_uploaded_at timestamptz,
  slip_auto_verified boolean not null default false,
  slip_verify_meta jsonb,
  status text not null default 'pending_upload' check (status in (
    'pending_upload', 'pending_review', 'approved', 'rejected', 'expired', 'cancelled'
  )),
  admin_notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_orders_user on subscription_orders(user_id, created_at desc);
create index if not exists idx_sub_orders_status on subscription_orders(status, created_at desc);
create index if not exists idx_sub_orders_ref on subscription_orders(order_ref);

alter table subscription_orders enable row level security;

drop policy if exists "sub_orders_user_read" on subscription_orders;
create policy "sub_orders_user_read" on subscription_orders
  for select using (auth.uid() = user_id);

drop policy if exists "sub_orders_user_insert" on subscription_orders;
create policy "sub_orders_user_insert" on subscription_orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "sub_orders_user_update_slip" on subscription_orders;
create policy "sub_orders_user_update_slip" on subscription_orders
  for update using (
    auth.uid() = user_id
    and status = 'pending_upload'
  );

-- Admin policies handled server-side via service role key.
-- ADMIN_EMAIL check is enforced in API routes.

-- updated_at trigger
create or replace function sub_orders_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sub_orders_touch on subscription_orders;
create trigger sub_orders_touch before update on subscription_orders
  for each row execute function sub_orders_touch_updated_at();

-- Storage bucket for slip uploads (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-slips',
  'subscription-slips',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies: users can upload/read only files in their own folder (user_id/*)
drop policy if exists "slips_user_upload" on storage.objects;
create policy "slips_user_upload" on storage.objects
  for insert with check (
    bucket_id = 'subscription-slips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "slips_user_read_own" on storage.objects;
create policy "slips_user_read_own" on storage.objects
  for select using (
    bucket_id = 'subscription-slips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
