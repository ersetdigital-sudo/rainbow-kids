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
  bank text not null default ''
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
  reason text,
  note text,
  -- Rincian usulan: saleRequest, purchaseRequest, revision, changes, snapshot.
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
-- 8. Hak akses tabel
-- Satu toko dipakai bersama, jadi setiap pengguna yang sudah login
-- (role "authenticated") boleh baca & tulis. Tamu (anon) tidak dapat apa pun.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'store_settings', 'role_permissions', 'products', 'product_variants',
      'customers', 'suppliers', 'sales', 'sale_items', 'sale_payments',
      'purchases', 'purchase_items', 'opnames', 'opname_lines',
      'approvals', 'stock_history', 'expenses'
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
-- 9. Cek hasil: harus muncul 16 tabel di bawah ini.
-- ---------------------------------------------------------------------------

select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- Catatan:
-- * Tabel lama `public.app_state` (satu baris jsonb) tidak dipakai lagi.
--   Isinya diimpor otomatis ke tabel di atas saat aplikasi pertama dibuka,
--   setelah itu boleh dihapus: `drop table public.app_state;`
-- * Akun pengguna tidak disimpan di tabel sini — memakai Supabase Auth
--   (Authentication -> Users), jadi tidak perlu tabel users/profiles.
