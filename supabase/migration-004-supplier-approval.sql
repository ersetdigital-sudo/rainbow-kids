-- ===========================================================================
-- MIGRASI 004 — APPROVAL SUPPLIER & ROLE TANPA FALLBACK
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query, tempel seluruh
-- isi file ini, lalu Run. Aman dijalankan ulang (idempotent).
--
-- Isi:
--   1. Kolom status untuk tabel suppliers (Menunggu / Aktif / Diarsipkan).
--   2. Kolom supplier_id & supplier_name untuk tabel approvals.
--   3. public.current_app_role() hanya membaca app_metadata; akun tanpa role
--      dianggap "User" (fallback user_metadata dibuang).
--   4. RLS suppliers: semua pengguna login boleh baca, tulis hanya
--      Owner & Approver.
--
-- Catatan: data customer tidak disentuh. Supplier lama tetap "Aktif" karena
-- aplikasi memperlakukan status kosong sebagai Aktif.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Kolom baru
-- ---------------------------------------------------------------------------

alter table public.suppliers
  add column if not exists status text;

alter table public.approvals
  add column if not exists supplier_id text;

alter table public.approvals
  add column if not exists supplier_name text;

create index if not exists approvals_supplier_idx
  on public.approvals (supplier_id);

-- ---------------------------------------------------------------------------
-- 2. Helper role dari JWT (tanpa fallback user_metadata)
--    Akun tanpa role di app_metadata dianggap role paling rendah (User).
-- ---------------------------------------------------------------------------

create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''), 'User');
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
-- 3. RLS suppliers
--    Baca: semua pengguna login.
--    Tulis (insert/update/delete): hanya Owner & Approver.
--
--    Alur aplikasi:
--    * Owner/Approver menambah, mengubah, menghapus supplier langsung.
--    * Admin/User mengirim pengajuan lewat tabel approvals (bukan menulis
--      suppliers), jadi alur approval tetap sah tanpa memberi hak tulis.
--    * Supplier yang sudah dipakai di nota pembelian tidak dihapus, hanya
--      statusnya diubah menjadi Diarsipkan oleh Owner/Approver.
-- ---------------------------------------------------------------------------

alter table public.suppliers enable row level security;

drop policy if exists "toko akses penuh" on public.suppliers;
drop policy if exists "supplier dibaca semua" on public.suppliers;
drop policy if exists "supplier ditulis penyetuju" on public.suppliers;

create policy "supplier dibaca semua" on public.suppliers
  for select to authenticated
  using (true);

create policy "supplier ditulis penyetuju" on public.suppliers
  for all to authenticated
  using (public.current_app_role() in ('Owner', 'Approver'))
  with check (public.current_app_role() in ('Owner', 'Approver'));

-- ---------------------------------------------------------------------------
-- 4. Cek hasil (opsional)
-- ---------------------------------------------------------------------------

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('suppliers', 'approvals')
  and column_name in ('status', 'supplier_id', 'supplier_name')
order by table_name, column_name;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'suppliers'
order by policyname;
