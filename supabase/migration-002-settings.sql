-- ===========================================================================
-- MIGRASI 002 — pengaturan toko tambahan
--
-- Untuk database yang sudah memakai skema lama (sebelum ada logo invoice,
-- jatuh tempo bawaan, ambang stok menipis, dan metode pembayaran yang bisa
-- diatur). Jalankan sekali di Supabase Dashboard -> SQL Editor -> Run.
--
-- Aman dijalankan berulang: semua perintah memakai "if not exists".
-- Database baru tidak perlu file ini — supabase/schema.sql sudah memuatnya.
-- ===========================================================================

alter table public.store_settings
  add column if not exists logo text not null default '',
  add column if not exists note text not null default '',
  add column if not exists due_days smallint not null default 14,
  add column if not exists min_stock smallint not null default 15,
  add column if not exists pay_methods text not null default 'Transfer|Tunai|QRIS';

-- Cek hasil: harus muncul 5 kolom baru.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'store_settings'
order by ordinal_position;
