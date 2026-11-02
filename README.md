# Rainbow Kids — Business Suite (Next.js)

Konversi dari mockup HTML statis (`legacy/index.html` + `legacy/assets/app.css`) menjadi
aplikasi **Next.js App Router + TypeScript + Tailwind CSS v4**.

Identitas visual dipertahankan: **Honey Gold × Deep Navy** (`#04123F` navy, `#FEC40B` gold),
font Plus Jakarta Sans, sidebar gelap, tabel yang berubah jadi kartu di mobile, dan drawer
form yang jadi bottom sheet di layar kecil.

> ⚠️ Tanpa kredensial Supabase, seluruh data disimpan di `localStorage` browser (mode lokal, tanpa login).
> Dengan kredensial Supabase, data toko disimpan di database dan setiap pengguna masuk dengan email + password.

## Menyambung Supabase

1. Jalankan `supabase/schema.sql` di project Supabase: **Dashboard → SQL Editor → New query → Run**.
   Skrip ini membuat tabel relasional: `products` + `product_variants`, `customers`,
   `suppliers`, `sales` + `sale_items` + `sale_payments`, `purchases` + `purchase_items`,
   `opnames` + `opname_lines`, `approvals`, `stock_history`, `expenses`,
   `store_settings`, `role_permissions` — beserta policy RLS-nya. Aman dijalankan ulang.
   Foreign key: `product_variants.product_id → products`, `sale_items/purchase_items/
   opname_lines/stock_history.vid → product_variants`, `sales.customer_id → customers`
   (`on delete set null`, nama toko tetap tersimpan di invoice).
   Kalau dulu sempat jalan versi lama (satu tabel `app_state`), isinya diimpor otomatis
   sekali saat aplikasi dibuka, lalu tabel `app_state` boleh dihapus.
2. Isi tiga kredensial lewat halaman Secrets aplikasi (jangan tulis di file):
   - `NEXT_PUBLIC_SUPABASE_URL` — *Project Settings → API → Project URL*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — *Project Settings → API → anon public*
   - `SUPABASE_SERVICE_ROLE_KEY` — *Project Settings → API → service_role* (hanya dipakai server untuk membuat akun)
3. Buka aplikasi: layar masuk muncul. Karena belum ada akun, isi **Buat akun Owner** (nama, email, password).
4. Pengguna lain ditambahkan dari menu **Pengguna &amp; Akses → Tambah pengguna** (lengkap dengan password).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run lint
```

Deploy ke Vercel: import repo ini di [vercel.com/new](https://vercel.com/new), atau `vercel --prod`.
Set env var `NEXT_PUBLIC_SITE_URL` (dipakai untuk canonical URL, `sitemap.xml`, dan `robots.txt`).

## Struktur folder

```
src/
├── app/                    # App Router
│   ├── layout.tsx          # font, metadata global, provider + shell
│   ├── globals.css         # token desain (Tailwind v4 @theme) + komponen kustom
│   ├── page.tsx            # Dashboard
│   ├── sales/ ar/ stock/ purchases/ opname/ reports/ approvals/ users/ invoice/
│   ├── invoice/[id]/       # invoice per transaksi (+ generateMetadata)
│   ├── sitemap.ts robots.ts not-found.tsx
├── components/
│   ├── layout/             # Sidebar, Topbar, BottomNav, AppShell
│   ├── ui/                 # DataTable, Drawer, Kpi, Badge, Icon, PageHead
│   ├── charts/             # AreaChart, ColumnBars, HBarList (SVG murni)
│   └── modules/            # view per fitur (dashboard, sales, ar, stock, ...)
├── lib/
│   ├── types.ts            # tipe domain
│   ├── workspace.ts        # ruang kerja kosong + hak akses bawaan
│   ├── users.ts            # daftar & ubah akun pengguna (Supabase Auth)
│   ├── calc.ts             # helper laba/piutang
│   ├── date.ts format.ts   # util tanggal & rupiah
│   ├── persist.ts          # external store (localStorage) untuk useSyncExternalStore
│   ├── remote.ts           # baca/tulis state ke Supabase (debounce + antrian)
│   ├── db/                 # lapisan data: satu modul per domain
│   │   ├── client.ts       # helper query + diff baris
│   │   ├── products.ts     # produk & varian
│   │   ├── partners.ts     # pelanggan & supplier
│   │   ├── sales.ts        # penjualan, barang, pembayaran
│   │   ├── purchases.ts    # pembelian supplier
│   │   ├── opnames.ts      # stok opname
│   │   ├── approvals.ts    # approval & audit
│   │   ├── settings.ts     # identitas toko + hak akses role
│   │   ├── logs.ts         # histori stok & biaya
│   │   └── index.ts        # loadStore() / saveStore()
│   ├── store.tsx           # context + seluruh action (create context, apply di store)
│   └── nav.ts              # konfigurasi menu + ikon
legacy/                     # HTML & CSS asli (referensi, tidak dipakai runtime)
```

## Data aplikasi

Tidak ada data toko di dalam kode: seluruh data tersimpan di Supabase dalam tabel
terpisah (`supabase/schema.sql`), satu modul kode per domain di `src/lib/db/`.
Daftar pengguna dan role-nya adalah akun Supabase Auth yang sebenarnya
(`GET/POST/PATCH /api/users`).

| Item | Diisi dari | Tersimpan di |
| --- | --- | --- |
| Identitas toko (nama, alamat, HP, email, NPWP, rekening) | Pengaturan Toko | `store_settings` |
| Hak akses per role | Pengguna & Akses | `role_permissions` |
| Pengguna, role, status aktif | Pengguna & Hak Akses | Supabase Auth (`user_metadata.role`, ban = nonaktif) |
| Produk & stok varian | Produk & Stok | `products`, `product_variants` |
| Pelanggan / supplier | menu masing-masing | `customers`, `suppliers` |
| Penjualan / piutang | Penjualan | `sales`, `sale_items`, `sale_payments` |
| Pembelian supplier | Pembelian | `purchases`, `purchase_items` |
| Stok opname | Stok Opname | `opnames`, `opname_lines` |
| Approval, histori stok, biaya | Approval & Laporan | `approvals`, `stock_history`, `expenses` |

Sisa nilai branding yang masih di kode hanya teks identitas aplikasi (judul
halaman/metadata SEO `Rainbow Kids`), bukan data toko.
| Kontak WhatsApp / tautan sosial | tidak ada di HTML asli | belum ada — tambahkan di `src/components/layout/Topbar.tsx` |
| Logo & gambar produk | tidak ada di HTML asli (semua ikon SVG inline) | `public/` |
| Placeholder foto invoice | tidak ada | `src/components/modules/invoice/InvoiceView.tsx` |
| Domain produksi | fallback `https://rainbowkids.id` | `NEXT_PUBLIC_SITE_URL` |

## Alur kerja (hasil revisi sesuai feedback customer)

```
PEMBELIAN SUPPLIER ──ajukan nota──▶ approval Owner ──▶ pembelian tercatat + stok bertambah
        │                                │
        │ (status bayar: Belum Lunas ──▶ ajukan pelunasan ──▶ approval Owner ──▶ Lunas)
        │                                │
        ▼                                ▼
   Stok opname (sistem vs fisik → selisih ± penyebab)
                                        
PENJUALAN BARU ──ajukan──▶ approval Owner ──▶ invoice tercatat + stok berkurang
     │                       (detail approval memuat laba tiap unit/jenis barang)
     │                       (boleh minus → ditandai merah + peringatan restock)
     │
     ├── harga jual bebas per transaksi (histori harga tampil sebagai acuan)
     ├── ongkir + packing + biaya lain per order → laba order = penjualan − modal − biaya
     ├── ubah harga unit / biaya order → PENGAJUAN → approval Owner → berlaku
     └── tempo → PIUTANG: belum jatuh tempo / jatuh tempo / terlambat / menunggu approval / lunas
                     └─ bayar sebagian → langsung berlaku
                     └─ pelunasan     → PENGAJUAN → approval Owner → status Lunas
```

**Aturan main yang diterapkan**

| Aturan | Implementasi |
| --- | --- |
| Pelanggan & supplier | Dipilih dari popup data tersimpan (`Picker`), bisa tambah baru langsung dari popup |
| Harga jual bebas | Saat transaksi baru, harga jual diisi bebas; rentang `minPrice`/`maxPrice` produk hanya acuan, dan form menampilkan histori harga jual sebelumnya (terendah–tertinggi) |
| Ubah harga & biaya invoice | Di detail penjualan bisa ubah harga per unit serta ekspedisi/packing/biaya lain; hasilnya pengajuan approval Owner, laba sebelum/sesudah tetap terlihat |
| Invoice baru | Transaksi baru diajukan ke Approval Owner; penjualan, pengurangan stok, dan pembayaran baru tercatat setelah disetujui |
| Laba per unit | Detail approval invoice baru, form transaksi, detail penjualan, detail piutang, dan rincian internal invoice menampilkan laba tiap unit/jenis barang (hijau/merah) di samping laba total order |
| Approval nota belanja | Satu nota supplier = satu pengajuan approval. Nota baru belum tercatat sebelum disetujui (stok & harga modal ikut menunggu); tombol “Detail” menampilkan barang yang dibelanjakan beserta naik/turun harga beli |
| Harga modal | Tampil di layar internal (form & daftar); **tidak pernah** tampil di invoice A4 pelanggan |
| Stok minus | Penjualan tetap dicatat, stok jadi minus → badge merah + label “PERLU RESTOCK” + banner peringatan di Dashboard & Produk |
| Pelunasan invoice | Pembayaran sebagian berlaku langsung; pelunasan jadi pengajuan dan baru berlaku setelah disetujui Owner |
| Status bayar pembelian | “Belum Lunas” → ajukan pelunasan → approval Owner → “Lunas” |
| Ekspor | Tombol “Ekspor Excel” di Penjualan & Piutang → `.csv` (BOM UTF-8, separator `;`) yang langsung dibuka Excel |
| Riwayat perubahan | Varian/produk, pelunasan, dan status pembelian tercatat di menu Approval (sebelum → sesudah) |

## Fitur

- **Dashboard** — omzet hari/bulan, estimasi laba, total & nilai stok, grafik area 14 hari, piutang aktif, transaksi terbaru, banner peringatan restock.
- **Penjualan** — pelanggan dari popup data tersimpan (+ tambah baru), harga jual bebas dengan histori harga sebagai acuan, kolom tanggal order + jatuh tempo, biaya ongkir/packing/lain, filter status bayar (lunas/belum lunas) & jenis, pencarian no. invoice/pelanggan, detail order + laba total & laba per unit, transaksi baru masuk approval Owner, pengajuan ubah harga/biaya, ekspor Excel.
- **Piutang** — ringkasan total tagihan (belum jatuh tempo / jatuh tempo / terlambat) + kartu status, pencarian no. invoice/pelanggan, pembayaran sebagian (langsung berlaku) & pengajuan pelunasan (approval Owner), ekspor Excel.
- **Produk & Stok** — kategori bebas, varian, rentang harga jual min–max, stok minus/prioritas restock, riwayat perubahan, pengajuan ubah harga (lewat approval).
- **Pembelian Supplier** — supplier dari popup data tersimpan (+ tambah baru), satu nota = satu pengajuan approval (detail nota menampilkan barang + perubahan harga beli), status “Belum Lunas” → approval Owner → “Lunas”, nota baru masuk approval dulu sebelum stok bertambah.
- **Stok Opname** — input stok fisik, penyebab selisih, persetujuan Owner sebelum stok disesuaikan.
- **Invoice** — template A4 siap cetak/PDF (tanpa harga modal) + panel rincian internal (pembayaran, sisa tagihan, laba).
- **Approval & Audit** — jejak audit untuk invoice penjualan baru (lengkap dengan catatan laba tiap unit/jenis barang), harga, nama varian, pelunasan invoice, dan status pembelian.
- **Laporan** — penjualan, laba per order, pengeluaran, pembelian, stok, piutang (per bulan, siap cetak).
- **Pengguna & Akses** — role & matriks hak akses per modul.

## Catatan teknis

- Data demo disimpan di `localStorage` key `rk_mock_v2` (kompatibel dengan versi HTML lama). Tombol **Reset demo** di sidebar mengembalikan data awal.
- `useSyncExternalStore` dipakai agar state bisa dibaca di server & browser tanpa hydration mismatch.
- Animasi memakai `motion` (Framer Motion v14): transisi halaman, drawer, toast, masuknya KPI.
- Seluruh halaman statis (prerender) kecuali `/invoice/[id]` yang partial-prerender.
