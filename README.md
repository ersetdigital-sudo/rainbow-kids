# Rainbow Kids — Business Suite (Next.js)

Konversi dari mockup HTML statis (`legacy/index.html` + `legacy/assets/app.css`) menjadi
aplikasi **Next.js App Router + TypeScript + Tailwind CSS v4**.

Identitas visual dipertahankan: **Honey Gold × Deep Navy** (`#04123F` navy, `#FEC40B` gold),
font Plus Jakarta Sans, sidebar gelap, tabel yang berubah jadi kartu di mobile, dan drawer
form yang jadi bottom sheet di layar kecil.

> ⚠️ Masih **prototipe**: seluruh data disimpan di `localStorage` browser (tidak ada backend).

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
│   ├── page.tsx            # Dashboard (+ JSON-LD LocalBusiness)
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
│   ├── seed.ts             # data demo deterministik
│   ├── calc.ts             # helper laba/piutang
│   ├── date.ts format.ts   # util tanggal & rupiah
│   ├── persist.ts          # external store (localStorage) untuk useSyncExternalStore
│   ├── store.tsx           # context + seluruh action (create context, apply di store)
│   └── nav.ts              # konfigurasi menu + ikon
legacy/                     # HTML & CSS asli (referensi, tidak dipakai runtime)
```

## Yang perlu diisi manual

Semua data berasal dari mockup, jadi nilai berikut **placeholder** dan perlu diganti:

| Item | Nilai sekarang | Lokasi |
| --- | --- | --- |
| Identitas bisnis (nama, alamat, HP, email, NPWP, rekening) | `Rainbow Kids`, Jl. Pelangi Raya, 0812-2233-4455, halo@rainbowkids.id, NPWP 01.234.567.8-423.000, BCA 123-456-7890 | `src/lib/seed.ts` (`biz`) |
| Tanggal acuan demo (`TODAY`) | `2026-10-20` | `src/lib/date.ts` |
| User & role (Budi/Rina/Dimas/Sari) | data dummy | `src/lib/seed.ts` (`users`, `perms`) |
| Produk, pelanggan, transaksi | data dummy 40 hari | `src/lib/seed.ts` |
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
