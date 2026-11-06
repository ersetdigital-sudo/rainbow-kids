-- ===========================================================================
-- MIGRASI 003 — KEAMANAN: ROLE DARI APP_METADATA & RLS
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query, tempel seluruh
-- isi file ini, lalu Run. Aman dijalankan ulang (idempotent).
--
-- Isi:
--   1. Salin role semua akun lama dari user_metadata -> app_metadata.
--   2. Helper public.current_app_role() yang membaca role dari JWT.
--   3. RLS: role_permissions & store_settings hanya bisa ditulis Owner.
--   4. RLS: approvals boleh dibuat semua pengguna, keputusan hanya
--      Approver/Owner, hapus hanya Owner.
--   5. Cabut EXECUTE public.rls_auto_enable() dari anon & authenticated.
--   6. Tabel operasional lain dibiarkan seperti sebelumnya.
--
-- Catatan: tabel public.app_state sengaja tidak disentuh.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Role akun lama: user_metadata -> app_metadata
--    user_metadata bisa diubah pemilik akun lewat anon key, app_metadata tidak.
-- ---------------------------------------------------------------------------

-- Kolom aslinya di auth.users: raw_app_meta_data / raw_user_meta_data.
update auth.users
set raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(raw_user_meta_data ->> 'role'),
      true
    )
where coalesce(raw_app_meta_data ->> 'role', '') = ''
  and coalesce(raw_user_meta_data ->> 'role', '') in ('Owner', 'Admin', 'Approver', 'User');

-- ---------------------------------------------------------------------------
-- 2. Helper role dari JWT
--    Membaca app_metadata.role; user_metadata hanya fallback akun lama yang
--    tokennya belum diperbarui (role tetap disalin lewat langkah 1).
-- ---------------------------------------------------------------------------

create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')
  );
$$;

revoke all on function public.current_app_role() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.current_app_role() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.current_app_role() to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Pengaturan toko & hak akses: baca semua pengguna, tulis hanya Owner
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in select unnest(array['store_settings', 'role_permissions'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "toko akses penuh" on public.%I', t);
    execute format('drop policy if exists "pengaturan dibaca semua" on public.%I', t);
    execute format('drop policy if exists "pengaturan ditulis owner" on public.%I', t);
    execute format(
      'create policy "pengaturan dibaca semua" on public.%I for select to authenticated using (true)',
      t
    );
    execute format(
      'create policy "pengaturan ditulis owner" on public.%I for all to authenticated using (public.current_app_role() = ''Owner'') with check (public.current_app_role() = ''Owner'')',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Approval & audit
--    Semua pengguna boleh membaca dan membuat pengajuan. Mengubah keputusan
--    (setujui/tolak) hanya Approver & Owner, menghapus hanya Owner.
--    Aplikasi memakai INSERT untuk pengajuan baru supaya role "Ajukan" tidak
--    butuh hak update.
-- ---------------------------------------------------------------------------

alter table public.approvals enable row level security;

drop policy if exists "toko akses penuh" on public.approvals;
drop policy if exists "approval dibaca semua" on public.approvals;
drop policy if exists "approval diajukan semua" on public.approvals;
drop policy if exists "approval diputuskan penyetuju" on public.approvals;
drop policy if exists "approval dihapus owner" on public.approvals;

create policy "approval dibaca semua" on public.approvals
  for select to authenticated
  using (true);

create policy "approval diajukan semua" on public.approvals
  for insert to authenticated
  with check (true);

create policy "approval diputuskan penyetuju" on public.approvals
  for update to authenticated
  using (public.current_app_role() in ('Owner', 'Approver'))
  with check (public.current_app_role() in ('Owner', 'Approver'));

create policy "approval dihapus owner" on public.approvals
  for delete to authenticated
  using (public.current_app_role() = 'Owner');

-- ---------------------------------------------------------------------------
-- 5. Tutup EXECUTE public.rls_auto_enable() (helper internal Supabase)
-- ---------------------------------------------------------------------------

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  loop
    execute format('revoke all on function %s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', fn);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Cek hasil (opsional)
-- ---------------------------------------------------------------------------

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('store_settings', 'role_permissions', 'approvals')
order by tablename, policyname;
