import { TODAY, addDays } from "./date";
import type {
  ArStatus,
  CustomerStatus,
  DB,
  Payment,
  PaymentPosition,
  Product,
  Purchase,
  Sale,
  SaleItem,
  SaleRequest,
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

/** Laba kotor per unit (harga jual − modal), sebelum biaya operasional. */
export const itemProfit = (i: SaleItem) => i.price - i.cost;

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
  // Tanpa jatuh tempo (tunai) tapi masih ada sisa — mis. harga diubah lewat
  // approval setelah pembayaran tunai tercatat.
  if (!s.due) return "Belum jatuh tempo";
  if (s.due < today) return "Terlambat";
  if (s.due <= addDays(today, 3)) return "Jatuh tempo";
  return "Belum jatuh tempo";
}

/** Status pelanggan; data lama tanpa status dianggap aktif. */
export const customerStatus = (customer: {
  status?: CustomerStatus;
}): CustomerStatus => customer.status ?? "Aktif";

/** Cocokkan sale ke pelanggan lewat ID, atau nama untuk data lama. */
export function saleBelongsToCustomer(
  sale: Sale,
  customer: { id?: string; name: string },
): boolean {
  if (customer.id && sale.customerId)
    return sale.customerId === customer.id;
  return (
    sale.customer.trim().toLowerCase() ===
    customer.name.trim().toLowerCase()
  );
}

/**
 * Invoice milik pelanggan yang masih punya sisa tagihan dan sudah lewat
 * jatuh tempo (due < TODAY). Invoice dengan pengajuan pelunasan tetap masuk.
 */
export function overdueSales(
  db: DB,
  customer: { id?: string; name: string },
): Sale[] {
  return db.sales
    .filter((s) => saleBelongsToCustomer(s, customer))
    .filter(
      (s) =>
        saleTotal(s) - salePaid(s) > 0 && Boolean(s.due) && (s.due as string) < TODAY,
    )
    .sort((a, b) => ((a.due as string) < (b.due as string) ? -1 : 1));
}

/**
 * Posisi tagihan ringkas untuk ditampilkan di approval:
 * Lunas, Belum Lunas, atau Belum Jatuh Tempo.
 */
export function paymentPosition(s: Sale, today = TODAY): PaymentPosition {
  if (saleTotal(s) - salePaid(s) <= 0) return "Lunas";
  if (s.due && s.due > today) return "Belum Jatuh Tempo";
  return "Belum Lunas";
}

/** Posisi tagihan untuk usulan invoice baru yang belum tercatat. */
export function saleRequestPosition(
  req: SaleRequest,
  today = TODAY,
): PaymentPosition {
  const total = req.items.reduce((a, i) => a + i.qty * i.price, 0);
  const paid = req.type === "tunai" ? total : +req.paid || 0;
  if (total - paid <= 0) return "Lunas";
  if (req.due && req.due > today) return "Belum Jatuh Tempo";
  return "Belum Lunas";
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

/**
 * Riwayat harga jual sebuah varian dari transaksi sebelumnya.
 * Dipakai sebagai acuan saat mengisi harga jual — bukan pembatas.
 */
export function salePriceHistory(db: DB, vid: string) {
  const rows = db.sales
    .flatMap((s) =>
      s.items
        .filter((i) => i.vid === vid)
        .map((i) => ({ price: i.price, date: s.date })),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rows.length) return null;
  const values = rows.map((r) => r.price);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    last: rows[0].price,
    count: values.length,
  };
}

/* ---------- Harga pembelian terakhir (untuk perbandingan) ---------- */
export function lastPurchaseOf(db: DB, vid: string, excludeId?: string) {
  const rows = db.purchases
    .filter((p) => p.id !== excludeId && p.items.some((i) => i.vid === vid))
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
