-- ===========================================================================
-- MIGRASI 005 — diskon pada invoice penjualan
--
-- Menambah nominal diskon (rupiah, pengurang total) dan keterangan bebasnya.
-- Jalankan sekali di Supabase Dashboard -> SQL Editor -> Run.
--
-- Aman dijalankan berulang: semua perintah memakai "if not exists".
-- Database baru tidak perlu file ini — supabase/schema.sql sudah memuatnya.
-- ===========================================================================

alter table public.sales
  add column if not exists discount numeric not null default 0,
  add column if not exists discount_note text not null default '';

-- Cek hasil: harus muncul 2 kolom baru.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'sales'
  and column_name in ('discount', 'discount_note');
