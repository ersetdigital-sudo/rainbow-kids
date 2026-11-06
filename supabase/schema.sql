-- ===========================================================================
-- SKEMA DATABASE TOKO RAINBOW KIDS
--
-- Cara pakai: buka Supabase Dashboard -> SQL Editor -> New query,
-- tempel seluruh isi file ini, lalu klik "Run" (sekali saja).
--
-- File ini aman dijalankan ulang: semua perintah memakai "if not exists"
-- dan policy selalu dihapus lalu dibuat lagi.
-- Tidak ada data contoh di dalamnya — toko mulai kosong.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Pengaturan toko & hak akses (role × modul)
-- ---------------------------------------------------------------------------

create table if not exists public.store_settings (
  id smallint primary key check (id = 1),
  name text not null default '',
  addr text not null default '',
  phone text not null default '',
  email text not null default '',
  npwp text not null default '',
  bank text not null default '',
  -- Pengaturan operasional (lihat supabase/migration-002-settings.sql)
  logo text not null default '',
  note text not null default '',
  due_days smallint not null default 14,
  min_stock smallint not null default 15,
  pay_methods text not null default 'Transfer|Tunai|QRIS'
);

create table if not exists public.role_permissions (
  role text not null,
  module text not null,
  level text not null,
  primary key (role, module)
);

-- ---------------------------------------------------------------------------
-- 2. Produk & stok
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id text primary key,
  cat text not null default '',
  name text not null,
  min_price numeric not null default 0,
  max_price numeric not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products (id) on delete cascade,
  name text not null,
  stock numeric not null default 0,
  cost numeric not null default 0,
  price numeric not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- 3. Toko pelanggan & supplier
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id text primary key,
  name text not null,
  type text not null default 'Toko',
  phone text,
  address text,
  bank text,
  status text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  phone text,
  address text,
  status text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Penjualan (invoice + barang + pembayaran)
-- ---------------------------------------------------------------------------

create table if not exists public.sales (
  id text primary key,
  date date not null,
  customer text not null,
  customer_id text,
  type text not null,
  due date,
  ship numeric not null default 0,
  pack numeric not null default 0,
  other numeric not null default 0,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_date_idx on public.sales (date);

create table if not exists public.sale_items (
  sale_id text not null references public.sales (id) on delete cascade,
  position integer not null,
  vid text not null,
  qty numeric not null default 0,
  price numeric not null default 0,
  cost numeric not null default 0,
  primary key (sale_id, position)
);

create table if not exists public.sale_payments (
  sale_id text not null references public.sales (id) on delete cascade,
  position integer not null,
  date date,
  amt numeric not null default 0,
  method text not null default '',
  status text,
  ref text,
  primary key (sale_id, position)
);

-- ---------------------------------------------------------------------------
-- 5. Pembelian / nota supplier
-- ---------------------------------------------------------------------------

create table if not exists public.purchases (
  id text primary key,
  nota text not null default '',
  supplier text not null default '',
  date date not null,
  pay_status text not null default 'Belum Lunas',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  purchase_id text not null references public.purchases (id) on delete cascade,
  position integer not null,
  vid text not null,
  qty numeric not null default 0,
  cost numeric not null default 0,
  primary key (purchase_id, position)
);

create index if not exists purchases_date_idx on public.purchases (date);

-- ---------------------------------------------------------------------------
-- 6. Stok opname (hitung fisik vs stok sistem)
-- ---------------------------------------------------------------------------

create table if not exists public.opnames (
  id text primary key,
  date date not null,
  status text not null default 'Draft',
  submitted_by text,
  submitted_at text,
  decided_by text,
  decided_at text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.opname_lines (
  opname_id text not null references public.opnames (id) on delete cascade,
  position integer not null,
  vid text not null,
  sys numeric not null default 0,
  phys numeric,
  note text not null default '',
  primary key (opname_id, position)
);

create index if not exists opnames_date_idx on public.opnames (date);

-- ---------------------------------------------------------------------------
-- 7. Approval & audit
-- ---------------------------------------------------------------------------

create table if not exists public.approvals (
  id text primary key,
  kind text not null,
  type text not null default '',
  vid text,
  field text,
  before_value jsonb,
  after_value jsonb,
  sale_id text,
  purchase_id text,
  customer_id text,
  customer_name text,
  supplier_id text,
  supplier_name text,
  reason text,
  note text,
  -- Rincian usulan: saleRequest, purchaseRequest, supplierRequest,
  -- revision, changes, snapshot.
  detail jsonb,
  user_name text,
  time text,
  status text not null default 'Menunggu',
  by_name text,
  decided_at text,
  ref text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists approvals_status_idx on public.approvals (status);

create table if not exists public.stock_history (
  id bigint generated always as identity primary key,
  vid text not null,
  date date,
  type text not null,
  description text not null default '',
  user_name text
);

create index if not exists stock_history_vid_idx on public.stock_history (vid);

create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  date date,
  cat text not null default '',
  amt numeric not null default 0
);

-- ---------------------------------------------------------------------------
-- 8. Relasi antar tabel (foreign key)
--
-- * Baris transaksi (penjualan, pembelian, opname, histori stok) menunjuk ke
--   varian produk yang benar-benar ada -> tidak ada lagi "vid" yatim.
-- * Varian yang masih dipakai transaksi tidak bisa dihapus (NO ACTION),
--   supaya riwayat penjualan/pembelian tidak ikut hilang.
-- * Toko yang dihapus tidak menghapus invoice-nya: `sales.customer_id`
--   di-set NULL, nama toko tetap tersimpan di kolom `customer`.
-- Aman dijalankan ulang: tiap constraint dicek dulu sebelum dibuat.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sale_items_vid_fkey' and conrelid = 'public.sale_items'::regclass
  ) then
    alter table public.sale_items
      add constraint sale_items_vid_fkey
      foreign key (vid) references public.product_variants (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'purchase_items_vid_fkey' and conrelid = 'public.purchase_items'::regclass
  ) then
    alter table public.purchase_items
      add constraint purchase_items_vid_fkey
      foreign key (vid) references public.product_variants (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'opname_lines_vid_fkey' and conrelid = 'public.opname_lines'::regclass
  ) then
    alter table public.opname_lines
      add constraint opname_lines_vid_fkey
      foreign key (vid) references public.product_variants (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'stock_history_vid_fkey' and conrelid = 'public.stock_history'::regclass
  ) then
    alter table public.stock_history
      add constraint stock_history_vid_fkey
      foreign key (vid) references public.product_variants (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_customer_id_fkey' and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_customer_id_fkey
      foreign key (customer_id) references public.customers (id) on delete set null;
  end if;
end $$;

-- Index untuk kolom relasi (mempercepat join & pengecekan foreign key).
create index if not exists sale_items_vid_idx on public.sale_items (vid);
create index if not exists purchase_items_vid_idx on public.purchase_items (vid);
create index if not exists opname_lines_vid_idx on public.opname_lines (vid);

-- ---------------------------------------------------------------------------
-- 9. Hak akses tabel
-- Satu toko dipakai bersama, jadi setiap pengguna yang sudah login
-- (role "authenticated") boleh baca & tulis data operasional. Tamu (anon)
-- tidak dapat apa pun.
--
-- Pengecualian (lihat juga supabase/migration-003-security.sql dan
-- supabase/migration-004-supplier-approval.sql):
-- * role_permissions & store_settings hanya boleh ditulis Owner.
-- * approvals boleh dibuat semua pengguna, keputusannya hanya Approver/Owner.
-- * suppliers hanya boleh ditulis Owner/Approver (Admin/User lewat approval).
-- ---------------------------------------------------------------------------

-- Role dibaca dari app_metadata (hanya service role yang bisa menulis).
-- Akun tanpa role di app_metadata dianggap role paling rendah (User).
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

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'product_variants',
      'customers', 'sales', 'sale_items', 'sale_payments',
      'purchases', 'purchase_items', 'opnames', 'opname_lines',
      'stock_history', 'expenses'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "toko akses penuh" on public.%I', t);
    execute format(
      'create policy "toko akses penuh" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Supplier: baca semua pengguna login, tulis hanya Owner & Approver.
-- Admin/User mengirim pengajuan lewat tabel approvals (bukan menulis suppliers).
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

-- Pengaturan toko & matriks hak akses: baca semua pengguna, tulis hanya Owner.
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

-- Approval & audit: ajukan boleh semua, putuskan hanya Approver/Owner.
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

-- Helper internal Supabase tidak perlu bisa dipanggil klien.
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

-- Hak akses SQL untuk role bawaan Supabase (aman bila role tidak ada).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant usage on schema public to authenticated';
    execute 'grant select, insert, update, delete on all tables in schema public to authenticated';
    execute 'grant usage, select on all sequences in schema public to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Cek hasil
-- A) harus muncul 16 tabel.
-- B) harus muncul 5 relasi foreign key.
-- ---------------------------------------------------------------------------

select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

select conrelid::regclass as tabel,
       conname as relasi,
       pg_get_constraintdef(oid) as definisi
from pg_constraint
where contype = 'f' and connamespace = 'public'::regnamespace
order by 1, 2;

-- Catatan:
-- * Tabel lama `public.app_state` (satu baris jsonb) tidak dipakai lagi.
--   Isinya diimpor otomatis ke tabel di atas saat aplikasi pertama dibuka,
--   setelah itu boleh dihapus: `drop table public.app_state;`
-- * Akun pengguna tidak disimpan di tabel sini — memakai Supabase Auth
--   (Authentication -> Users), jadi tidak perlu tabel users/profiles.
