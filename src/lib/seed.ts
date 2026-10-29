import { TODAY, addDays } from "./date";
import { saleTotal } from "./calc";
import type { DB } from "./types";

/** Hak akses bawaan per role (dipakai juga saat memulihkan snapshot lama). */
export const DEFAULT_PERMS: DB["perms"] = {
  Owner: { dash: "Penuh", sales: "Penuh", stock: "Penuh", purch: "Penuh", opname: "Setujui", ar: "Penuh", report: "Penuh", approval: "Setujui", users: "Penuh" },
  Admin: { dash: "Lihat", sales: "Penuh", stock: "Ajukan", purch: "Penuh", opname: "Input", ar: "Penuh", report: "Lihat", approval: "Ajukan", users: "Tidak" },
  Approver: { dash: "Lihat", sales: "Lihat", stock: "Lihat", purch: "Lihat", opname: "Setujui", ar: "Lihat", report: "Lihat", approval: "Setujui", users: "Tidak" },
  User: { dash: "Lihat", sales: "Input", stock: "Lihat", purch: "Input", opname: "Input", ar: "Lihat", report: "Tidak", approval: "Ajukan", users: "Tidak" },
};

/**
 * Data simulasi statis. Seed harus deterministik (tidak boleh pakai
 * Date.now/Math.random) supaya render server & client konsisten.
 */
export function seed(): DB {
  const products: DB["products"] = [
    {
      id: "p1",
      cat: "Pakaian",
      name: "Kaos Anak Rainbow",
      minPrice: 56000,
      maxPrice: 68000,
      variants: [
        { id: "v1", name: "Size S", stock: 84, cost: 32000, price: 59000 },
        { id: "v2", name: "Size M", stock: 41, cost: 34000, price: 62000 },
        { id: "v3", name: "Size L", stock: 12, cost: 36000, price: 65000 },
      ],
    },
    {
      id: "p2",
      cat: "Pakaian",
      name: "Piyama Anak Katun",
      minPrice: 88000,
      maxPrice: 102000,
      variants: [
        { id: "v4", name: "Motif Dino", stock: 120, cost: 58000, price: 95000 },
        { id: "v5", name: "Motif Unicorn", stock: 26, cost: 58000, price: 95000 },
      ],
    },
    {
      id: "p3",
      cat: "Mainan",
      name: "Puzzle Kayu Edukasi",
      minPrice: 45000,
      maxPrice: 54000,
      variants: [
        { id: "v6", name: "Huruf", stock: 64, cost: 27000, price: 49000 },
        { id: "v7", name: "Angka", stock: 9, cost: 27000, price: 49000 },
      ],
    },
    {
      id: "p4",
      cat: "Mainan",
      name: "Balok Susun Warna",
      minPrice: 140000,
      maxPrice: 265000,
      variants: [
        { id: "v8", name: "Isi 50", stock: 18, cost: 95000, price: 149000 },
        // Stok minus: terjual melebihi stok sistem (perlu restock).
        { id: "v9", name: "Isi 100", stock: -2, cost: 165000, price: 249000 },
      ],
    },
    {
      id: "p5",
      cat: "Perlengkapan Sekolah",
      name: "Botol Minum Anak",
      minPrice: 41000,
      maxPrice: 50000,
      variants: [
        { id: "v10", name: "450 ml", stock: 150, cost: 28000, price: 45000 },
      ],
    },
    {
      id: "p6",
      cat: "Perlengkapan Sekolah",
      name: "Tas Ransel Anak",
      minPrice: 108000,
      maxPrice: 190000,
      variants: [
        { id: "v11", name: "Kecil (TK)", stock: 55, cost: 74000, price: 119000 },
        { id: "v12", name: "Besar (SD)", stock: 6, cost: 105000, price: 169000 },
      ],
    },
  ];

  const customers: DB["customers"] = [
    { id: "c1", name: "Toko Ceria Kids", type: "Toko", phone: "0812-3300-1122", address: "Jl. Melati No. 12, Bandung" },
    { id: "c2", name: "Baby Shop Mutiara", type: "Toko", phone: "0813-2210-8890", address: "Jl. Sudirman No. 45, Bandung" },
    { id: "c3", name: "TK Pelangi Nusantara", type: "Toko", phone: "0812-7788-1001", address: "Jl. Asia Afrika No. 9, Bandung" },
    { id: "c4", name: "Ibu Ratna (Reseller)", type: "Reseller", phone: "0857-2244-7788" },
    { id: "c5", name: "Kids Corner Bekasi", type: "Toko", phone: "0813-9090-1212", address: "Jl. Ahmad Yani No. 3, Bekasi" },
    { id: "c6", name: "Toko Mainan Bintang", type: "Toko", phone: "0856-4455-3322", address: "Jl. Cibadak No. 21, Bandung" },
    { id: "c7", name: "Ibu Dewi (Reseller)", type: "Reseller", phone: "0812-6677-1212" },
    { id: "c8", name: "Little Star Boutique", type: "Toko", phone: "0878-2211-4455", address: "Jl. Setiabudi No. 7, Bandung" },
    { id: "c9", name: "Toko Perlengkapan Bayi Harmoni", type: "Toko", phone: "0812-9911-7766" },
    { id: "c10", name: "Rita Komala", type: "Ritel", phone: "0815-3322-8899" },
  ];

  const suppliers: DB["suppliers"] = [
    { id: "s1", name: "CV Garmen Ceria Bandung", phone: "022-7712345", address: "Jl. Industri No. 44, Bandung" },
    { id: "s2", name: "PT Tekstil Anak Indonesia", phone: "021-8876543", address: "Kawasan Industri MM2100" },
    { id: "s3", name: "UD Mainan Kayu Jepara", phone: "0291-551200" },
    { id: "s4", name: "CV Edu Toys Surabaya", phone: "031-8899112" },
    { id: "s5", name: "PT Tas Sekolah Prima", phone: "021-8899001" },
    { id: "s6", name: "CV Sentra Aksesoris Bayi", phone: "022-7781234" },
  ];

  const custs = customers.map((c) => c.name);
  const custByName = new Map(customers.map((c) => [c.name, c.id]));

  const V: Record<string, { price: number; cost: number }> = {};
  products.forEach((p) =>
    p.variants.forEach((v) => (V[v.id] = { price: v.price, cost: v.cost })),
  );

  const sales: DB["sales"] = [];
  let n = 1;
  const pick = <T,>(a: T[], i: number) => a[i % a.length];
  const vids = Object.keys(V);

  for (let d = 40; d >= 0; d--) {
    const cnt = (d * 7) % 3 + 1;
    for (let k = 0; k < cnt; k++) {
      const date = addDays(TODAY, -d);
      const i = d * 3 + k;
      const items: DB["sales"][number]["items"] = [];
      const ni = (i % 3) + 1;
      for (let j = 0; j < ni; j++) {
        const vid = pick(vids, i * 5 + j * 3);
        if (items.find((x) => x.vid === vid)) continue;
        const v = V[vid];
        items.push({ vid, qty: (i + j) % 6 + 1, price: v.price, cost: v.cost });
      }
      const tempo = i % 3 === 0;
      const customer = pick(custs, i);
      const s: DB["sales"][number] = {
        id: "INV-2610-" + String(n++).padStart(4, "0"),
        date,
        customer,
        customerId: custByName.get(customer),
        type: tempo ? "tempo" : "tunai",
        due: tempo ? addDays(date, 14) : null,
        items,
        ship: [0, 15000, 22000, 35000][i % 4],
        pack: [0, 5000, 8000][i % 3],
        other: 0,
        note: "",
        payments: [],
      };
      const tot = saleTotal(s);
      if (!tempo)
        s.payments.push({
          date,
          amt: tot,
          method: i % 2 ? "Transfer" : "Tunai",
          status: "Disetujui",
        });
      else if (d > 20)
        s.payments.push({
          date: addDays(date, 10),
          amt: tot,
          method: "Transfer",
          status: "Disetujui",
        });
      else if (i % 2)
        s.payments.push({
          date: addDays(date, 3),
          amt: Math.round((tot * 0.4) / 1000) * 1000,
          method: "Transfer",
          status: "Disetujui",
        });
      sales.push(s);
    }
  }

  // Contoh pengajuan pelunasan yang menunggu approval Owner.
  sales.forEach((s) => {
    if (s.id === "INV-2610-0079") {
      s.payments.push({
        date: addDays(TODAY, -1),
        amt: 228000,
        method: "Transfer",
        status: "Diajukan",
        ref: "AP-007",
      });
    }
  });

  const purchases: DB["purchases"] = [
    {
      id: "PB-001",
      nota: "NT/GCB/0912",
      supplier: "CV Garmen Ceria Bandung",
      date: addDays(TODAY, -34),
      items: [
        { vid: "v1", qty: 60, cost: 62000 },
        { vid: "v2", qty: 30, cost: 118000 },
        { vid: "v3", qty: 10, cost: 225000 },
      ],
      payStatus: "Lunas",
    },
    {
      id: "PB-002",
      nota: "PTA-22781",
      supplier: "PT Tekstil Anak Indonesia",
      date: addDays(TODAY, -28),
      items: [
        { vid: "v4", qty: 100, cost: 38000 },
        { vid: "v5", qty: 20, cost: 140000 },
      ],
      payStatus: "Belum Lunas",
    },
    {
      id: "PB-003",
      nota: "STR-0045",
      supplier: "UD Mainan Kayu Jepara",
      date: addDays(TODAY, -21),
      items: [
        { vid: "v6", qty: 50, cost: 27000 },
        { vid: "v7", qty: 20, cost: 41000 },
      ],
      payStatus: "Menunggu Lunas",
    },
    {
      id: "PB-004",
      nota: "INV/EDU/1003",
      supplier: "CV Edu Toys Surabaya",
      date: addDays(TODAY, -15),
      items: [
        { vid: "v8", qty: 12, cost: 95000 },
        { vid: "v9", qty: 10, cost: 95000 },
        { vid: "v10", qty: 100, cost: 28000 },
      ],
      payStatus: "Lunas",
    },
    {
      id: "PB-005",
      nota: "NT/GCB/1011",
      supplier: "CV Garmen Ceria Bandung",
      date: addDays(TODAY, -7),
      items: [
        { vid: "v1", qty: 40, cost: 62000 },
        { vid: "v2", qty: 20, cost: 118000 },
      ],
      payStatus: "Belum Lunas",
    },
    {
      id: "PB-006",
      nota: "TSP-778",
      supplier: "PT Tas Sekolah Prima",
      date: addDays(TODAY, -3),
      items: [
        { vid: "v11", qty: 40, cost: 24000 },
        { vid: "v12", qty: 5, cost: 205000 },
      ],
      payStatus: "Belum Lunas",
    },
  ];

  const history: DB["history"] = [
    { vid: "v1", date: addDays(TODAY, -34), type: "Stok", desc: "Pembelian PB-001 +60", user: "Rina (Admin)" },
    { vid: "v1", date: addDays(TODAY, -30), type: "Harga", desc: "Harga jual Rp 55.000 → Rp 59.000", user: "Budi (Owner)" },
    { vid: "v4", date: addDays(TODAY, -28), type: "Stok", desc: "Pembelian PB-002 +100", user: "Rina (Admin)" },
    { vid: "v7", date: addDays(TODAY, -18), type: "Harga", desc: "Harga modal Rp 25.000 → Rp 27.000", user: "Budi (Owner)" },
    { vid: "v9", date: addDays(TODAY, -12), type: "Stok", desc: "Stok opname SO-001: -1 (rusak)", user: "Budi (Owner)" },
    { vid: "v1", date: addDays(TODAY, -7), type: "Stok", desc: "Pembelian PB-005 +40", user: "Rina (Admin)" },
    { vid: "v9", date: addDays(TODAY, -2), type: "Stok", desc: "Penjualan INV-2610-0081 −9 (stok minus)", user: "Dimas (User)" },
  ];

  const approvals: DB["approvals"] = [
    {
      id: "AP-001",
      kind: "variant",
      type: "Harga jual",
      vid: "v2",
      field: "price",
      before: 59000,
      after: 62000,
      user: "Rina (Admin)",
      time: addDays(TODAY, -9) + " 10:14",
      status: "Disetujui",
      by: "Budi (Owner)",
    },
    {
      id: "AP-002",
      kind: "variant",
      type: "Nama varian",
      vid: "v7",
      field: "name",
      before: "Angka 1-10",
      after: "Angka",
      user: "Dimas (User)",
      time: addDays(TODAY, -6) + " 15:40",
      status: "Disetujui",
      by: "Budi (Owner)",
    },
    {
      id: "AP-003",
      kind: "variant",
      type: "Harga modal",
      vid: "v5",
      field: "cost",
      before: 58000,
      after: 61000,
      user: "Rina (Admin)",
      time: addDays(TODAY, -1) + " 09:02",
      status: "Menunggu",
    },
    {
      id: "AP-004",
      kind: "variant",
      type: "Harga jual",
      vid: "v12",
      field: "price",
      before: 169000,
      after: 179000,
      user: "Dimas (User)",
      time: TODAY + " 08:31",
      status: "Menunggu",
    },
    {
      id: "AP-005",
      kind: "variant",
      type: "Harga jual",
      vid: "v10",
      field: "price",
      before: 45000,
      after: 39000,
      user: "Dimas (User)",
      time: addDays(TODAY, -4) + " 11:20",
      status: "Ditolak",
      by: "Budi (Owner)",
    },
    {
      id: "AP-006",
      kind: "purchase",
      type: "Status pembayaran pembelian",
      purchaseId: "PB-003",
      before: "Belum Lunas",
      after: "Lunas",
      user: "Rina (Admin)",
      time: addDays(TODAY, -1) + " 16:20",
      status: "Menunggu",
    },
    {
      id: "AP-007",
      kind: "payment",
      type: "Pelunasan invoice",
      saleId: "INV-2610-0079",
      before: 228000,
      after: 228000,
      user: "Dimas (User)",
      time: addDays(TODAY, -1) + " 17:05",
      status: "Menunggu",
    },
  ];

  const opnames: DB["opnames"] = [
    {
      id: "SO-001",
      date: addDays(TODAY, -12),
      status: "Disetujui",
      by: "Budi (Owner)",
      lines: [
        { vid: "v8", sys: 19, phys: 19, note: "" },
        { vid: "v9", sys: 8, phys: 7, note: "Rusak saat pengiriman" },
        { vid: "v10", sys: 151, phys: 150, note: "Sampel display" },
      ],
    },
  ];

  const expenses: DB["expenses"] = [
    { date: addDays(TODAY, -19), cat: "Sewa gudang", amt: 2500000 },
    { date: addDays(TODAY, -15), cat: "Listrik & internet", amt: 780000 },
    { date: addDays(TODAY, -10), cat: "Gaji staff", amt: 6500000 },
    { date: addDays(TODAY, -4), cat: "Perlengkapan kemasan", amt: 450000 },
  ];

  const users: DB["users"] = [
    { name: "Budi Santoso", email: "budi@rainbowkids.id", role: "Owner", active: true },
    { name: "Rina Wulandari", email: "rina@rainbowkids.id", role: "Admin", active: true },
    { name: "Dimas Pratama", email: "dimas@rainbowkids.id", role: "User", active: true },
    { name: "Sari Lestari", email: "sari@rainbowkids.id", role: "Approver", active: false },
  ];

  return {
    products,
    customers,
    suppliers,
    sales,
    purchases,
    history,
    approvals,
    opnames,
    expenses,
    users,
    perms: DEFAULT_PERMS,
    biz: {
      name: "Rainbow Kids",
      addr: "Jl. Pelangi Raya No. 8, Bandung 40115",
      phone: "0812-2233-4455",
      email: "halo@rainbowkids.id",
      npwp: "",
      bank: "BCA 123-456-7890 a.n. Rainbow Kids",
    },
    user: "Budi (Owner)",
  };
}
