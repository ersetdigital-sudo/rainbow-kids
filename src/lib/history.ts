import { purchaseTotal, saleProfit, saleTotal } from "./calc";
import { formatMonth } from "./date";
import type { DB } from "./types";

/** Histori per toko (penjualan) atau per supplier (pembelian). */
export type HistorySide = "customer" | "supplier";
export type HistoryMode = "month" | "year";

/** Satu transaksi penjualan atau satu nota pembelian. */
export type Movement = {
  name: string;
  date: string;
  total: number;
  /** Laba order (toko) atau jumlah unit (supplier). */
  extra: number;
  items: { vid: string; qty: number; value: number }[];
};

export function movements(db: DB, side: HistorySide): Movement[] {
  if (side === "customer")
    return db.sales.map((s) => ({
      name: s.customer,
      date: s.date,
      total: saleTotal(s),
      extra: saleProfit(s),
      items: s.items.map((i) => ({
        vid: i.vid,
        qty: i.qty,
        value: i.qty * i.price,
      })),
    }));

  return db.purchases.map((p) => ({
    name: p.supplier,
    date: p.date,
    total: purchaseTotal(p),
    extra: p.items.reduce((a, i) => a + i.qty, 0),
    items: p.items.map((i) => ({
      vid: i.vid,
      qty: i.qty,
      value: i.qty * i.cost,
    })),
  }));
}

export type Bucket = {
  key: string;
  label: string;
  total: number;
  extra: number;
  count: number;
};

export function bucketKey(date: string, mode: HistoryMode) {
  return mode === "month" ? date.slice(0, 7) : date.slice(0, 4);
}

export function bucketLabel(key: string, mode: HistoryMode) {
  return mode === "year" ? key : formatMonth(key);
}

/** Rekap per bulan / per tahun, terbaru lebih dulu. */
export function bucketsOf(rows: Movement[], mode: HistoryMode): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const key = bucketKey(r.date, mode);
    const cur =
      map.get(key) ??
      { key, label: bucketLabel(key, mode), total: 0, extra: 0, count: 0 };
    cur.total += r.total;
    cur.extra += r.extra;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export type Group = {
  name: string;
  total: number;
  extra: number;
  count: number;
  last: string;
};

/** Peringkat toko / supplier pada satu periode (null = semua waktu). */
export function groupsOf(
  rows: Movement[],
  mode: HistoryMode,
  period: string | null,
): Group[] {
  const filtered = period ? rows.filter((r) => bucketKey(r.date, mode) === period) : rows;
  const map = new Map<string, Group>();
  for (const r of filtered) {
    const cur = map.get(r.name) ?? { name: r.name, total: 0, extra: 0, count: 0, last: r.date };
    cur.total += r.total;
    cur.extra += r.extra;
    cur.count += 1;
    if (r.date > cur.last) cur.last = r.date;
    map.set(r.name, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Barang yang dibeli/dijual, digabung per varian. */
export function itemsOf(rows: Movement[]) {
  const map = new Map<string, { vid: string; qty: number; value: number }>();
  for (const r of rows)
    for (const i of r.items) {
      const cur = map.get(i.vid) ?? { vid: i.vid, qty: 0, value: 0 };
      cur.qty += i.qty;
      cur.value += i.value;
      map.set(i.vid, cur);
    }
  return [...map.values()].sort((a, b) => b.value - a.value);
}
