-- Skema Supabase untuk aplikasi toko.
-- Jalankan sekali di Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.app_state (
  id integer primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Semua pengguna yang sudah login boleh membaca & menulis data toko.
drop policy if exists "app_state read" on public.app_state;
create policy "app_state read"
  on public.app_state for select
  to authenticated
  using (true);

drop policy if exists "app_state write" on public.app_state;
create policy "app_state write"
  on public.app_state for all
  to authenticated
  using (true)
  with check (true);
