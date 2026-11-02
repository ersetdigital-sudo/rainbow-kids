import type { DB, Prefs } from "./types";

/** Hak akses bawaan per role (dipakai juga saat memulihkan snapshot lama). */
export const DEFAULT_PERMS: DB["perms"] = {
  Owner: { dash: "Penuh", sales: "Penuh", stock: "Penuh", purch: "Penuh", opname: "Setujui", ar: "Penuh", report: "Penuh", expense: "Penuh", approval: "Setujui", users: "Penuh" },
  Admin: { dash: "Lihat", sales: "Penuh", stock: "Ajukan", purch: "Penuh", opname: "Input", ar: "Penuh", report: "Lihat", expense: "Penuh", approval: "Ajukan", users: "Tidak" },
  Approver: { dash: "Lihat", sales: "Lihat", stock: "Lihat", purch: "Lihat", opname: "Setujui", ar: "Lihat", report: "Lihat", expense: "Lihat", approval: "Setujui", users: "Tidak" },
  User: { dash: "Lihat", sales: "Input", stock: "Lihat", purch: "Input", opname: "Input", ar: "Lihat", report: "Tidak", expense: "Input", approval: "Ajukan", users: "Tidak" },
};

/** Nilai awal pengaturan operasional — semuanya bisa diubah di Pengaturan Toko. */
export const DEFAULT_PREFS: Prefs = {
  logo: "",
  note: "",
  dueDays: 14,
  minStock: 15,
  methods: ["Transfer", "Tunai", "QRIS"],
};

/**
 * Ruang kerja kosong: tanpa data contoh, siap diisi data toko yang sebenarnya.
 * Semua isinya datang dari Supabase (atau browser pada mode lokal), jadi tidak
 * ada identitas toko, produk, atau pengguna yang ditulis di dalam kode.
 */
export function emptyDb(): DB {
  return {
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    history: [],
    approvals: [],
    opnames: [],
    expenses: [],
    users: [],
    perms: DEFAULT_PERMS,
    biz: { name: "", addr: "", phone: "", email: "", npwp: "", bank: "" },
    prefs: DEFAULT_PREFS,
    user: "",
  };
}
