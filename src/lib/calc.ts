import { TODAY, addDays } from "./date";
import type {
  ArStatus,
  DB,
  Payment,
  Product,
  Purchase,
  Sale,
  Variant,
} from "./types";

export const saleSub = (s: Sale) =>
  s.items.reduce((a, i) => a + i.qty * i.price, 0);
export const saleCost = (s: Sale) =>
  s.items.reduce((a, i) => a + i.qty * i.cost, 0);
export const saleOps = (s: Sale) =>
  (+s.ship || 0) + (+s.pack || 0) + (+s.other || 0);
export const saleTotal = (s: Sale) => saleSub(s);
export const saleProfit = (s: Sale) => saleSub(s) - saleCost(s) - saleOps(s);

/** Pembayaran yang sudah berlaku (bukan pengajuan yang menunggu approval). */
export const salePaid = (s: Sale) =>
  s.payments
    .filter((p) => p.status !== "Diajukan" && p.status !== "Ditolak")
    .reduce((a, p) => a + p.amt, 0);

/** Pengajuan pelunasan/pembayaran yang menunggu approval Owner. */
export const saleProposed = (s: Sale) =>
  s.payments
    .filter((p) => p.status === "Diajukan")
    .reduce((a, p) => a + p.amt, 0);

export function arStatus(s: Sale, today = TODAY): ArStatus {
  const rem = saleTotal(s) - salePaid(s);
  if (rem <= 0) return "Lunas";
  if (saleProposed(s) >= rem) return "Menunggu Pelunasan";
  if (!s.due) return "Lunas";
  if (s.due < today) return "Terlambat";
  if (s.due <= addDays(today, 3)) return "Jatuh tempo";
  return "Belum jatuh tempo";
}

/** Varian + produk induk, flattened. */
export type FlatVariant = Variant & {
  pid: string;
  pname: string;
  cat: string;
  minPrice: number;
  maxPrice: number;
};

export function allV(db: DB): FlatVariant[] {
  return db.products.flatMap((p) =>
    p.variants.map((v) => ({
      ...v,
      pid: p.id,
      pname: p.name,
      cat: p.cat,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice,
    })),
  );
}

export function findVariant(
  db: DB,
  vid: string,
): (Variant & { product: Product }) | null {
  for (const p of db.products) {
    const v = p.variants.find((x) => x.id === vid);
    if (v) return { ...v, product: p };
  }
  return null;
}

export function variantLabel(db: DB, vid: string): string {
  const v = findVariant(db, vid);
  return v ? `${v.product.name} · ${v.name}` : vid;
}

export function purchaseTotal(p: { items: { qty: number; cost: number }[] }) {
  return p.items.reduce((a, i) => a + i.qty * i.cost, 0);
}

export function opnameDiff(line: { sys: number; phys: number | "" }) {
  if (line.phys === "") return 0;
  return line.phys - line.sys;
}

/* ---------------- Stok ---------------- */

/** Stok minus: penjualan melebihi stok sistem. */
export const isMinus = (v: { stock: number }) => v.stock < 0;

/** Perlu restock: stok minus atau menipis (di bawah ambang 15). */
export const needsRestock = (v: { stock: number }) => v.stock <= 0;

export const LOW_STOCK = 15;

/* ---------------- Harga jual ---------------- */

export function priceRange(db: DB, vid: string) {
  const v = findVariant(db, vid);
  if (!v) return null;
  return { min: v.product.minPrice, max: v.product.maxPrice };
}

export function inRange(db: DB, vid: string, price: number) {
  const r = priceRange(db, vid);
  if (!r) return true;
  return price >= r.min && price <= r.max;
}

/* ---------- Harga pembelian terakhir (untuk perbandingan) ---------- */
export function lastPurchaseOf(db: DB, vid: string) {
  const rows = db.purchases
    .filter((p) => p.items.some((i) => i.vid === vid))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const p = rows[0];
  if (!p) return null;
  const item = p.items.find((i) => i.vid === vid)!;
  return { cost: item.cost, date: p.date, nota: p.nota, id: p.id };
}

/* ---------------- Pembayaran ---------------- */

export const isApprovedPayment = (p: Payment) =>
  p.status === "Disetujui" || p.status === undefined;

export function purchaseOutstanding(p: Purchase) {
  return p.payStatus === "Lunas" ? 0 : purchaseTotal(p);
}
