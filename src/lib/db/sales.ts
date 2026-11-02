import type { Payment, PaymentStatus, Sale, SaleItem, SaleType } from "../types";
import { dateValue, deleteRows, diffRows, same, selectAll, upsertRows, type Row } from "./client";

type SaleRow = {
  id: string;
  date: string;
  customer: string;
  customer_id: string | null;
  type: string;
  due: string | null;
  ship: number;
  pack: number;
  other: number;
  note: string | null;
  position: number;
};

type ItemRow = {
  sale_id: string;
  position: number;
  vid: string;
  qty: number;
  price: number;
  cost: number;
};

type PaymentRow = {
  sale_id: string;
  position: number;
  date: string | null;
  amt: number;
  method: string;
  status: string | null;
  ref: string | null;
};

function saleRows(sales: Sale[]): SaleRow[] {
  return sales.map((s, index) => ({
    id: s.id,
    date: s.date,
    customer: s.customer,
    customer_id: s.customerId ?? null,
    type: s.type,
    due: dateValue(s.due),
    ship: s.ship,
    pack: s.pack,
    other: s.other,
    note: s.note ?? null,
    position: index,
  }));
}

function itemRows(sales: Sale[]): ItemRow[] {
  return sales.flatMap((s) =>
    s.items.map((i, index) => ({
      sale_id: s.id,
      position: index,
      vid: i.vid,
      qty: i.qty,
      price: i.price,
      cost: i.cost,
    })),
  );
}

function paymentRows(sales: Sale[]): PaymentRow[] {
  return sales.flatMap((s) =>
    s.payments.map((p, index) => ({
      sale_id: s.id,
      position: index,
      date: dateValue(p.date),
      amt: p.amt,
      method: p.method,
      status: p.status ?? null,
      ref: p.ref ?? null,
    })),
  );
}

export async function loadSales(): Promise<Sale[]> {
  const [sales, items, payments] = await Promise.all([
    selectAll<SaleRow>("sales"),
    selectAll<ItemRow>("sale_items"),
    selectAll<PaymentRow>("sale_payments"),
  ]);

  const itemsBySale = new Map<string, SaleItem[]>();
  for (const i of items) {
    const list = itemsBySale.get(i.sale_id) ?? [];
    list.push({
      vid: i.vid,
      qty: Number(i.qty),
      price: Number(i.price),
      cost: Number(i.cost),
    });
    itemsBySale.set(i.sale_id, list);
  }

  const paymentsBySale = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsBySale.get(p.sale_id) ?? [];
    list.push({
      date: p.date ?? "",
      amt: Number(p.amt),
      method: p.method,
      status: (p.status ?? undefined) as PaymentStatus | undefined,
      ref: p.ref ?? undefined,
    });
    paymentsBySale.set(p.sale_id, list);
  }

  return sales.map((s) => ({
    id: s.id,
    date: s.date,
    customer: s.customer,
    customerId: s.customer_id ?? undefined,
    type: s.type as SaleType,
    due: s.due,
    items: itemsBySale.get(s.id) ?? [],
    ship: Number(s.ship),
    pack: Number(s.pack),
    other: Number(s.other),
    note: s.note ?? undefined,
    payments: paymentsBySale.get(s.id) ?? [],
  }));
}

export async function saveSales(prev: Sale[], next: Sale[]): Promise<void> {
  const prevById = new Map(prev.map((s) => [s.id, s]));
  const header = diffRows(saleRows(prev), saleRows(next), (r) => r.id);

  await upsertRows("sales", header.changed as unknown as Row[]);
  await deleteRows("sales", "id", header.removed);

  // Barang & pembayaran sebuah invoice disimpan ulang saat isinya berubah.
  const itemsChanged = next.filter((s) => {
    const before = prevById.get(s.id);
    return !before || !same(itemRows([before]), itemRows([s]));
  });
  const paymentsChanged = next.filter((s) => {
    const before = prevById.get(s.id);
    return !before || !same(paymentRows([before]), paymentRows([s]));
  });

  if (itemsChanged.length) {
    const ids = itemsChanged.map((s) => s.id);
    await deleteRows("sale_items", "sale_id", ids);
    await upsertRows("sale_items", itemRows(itemsChanged) as unknown as Row[]);
  }
  if (paymentsChanged.length) {
    const ids = paymentsChanged.map((s) => s.id);
    await deleteRows("sale_payments", "sale_id", ids);
    await upsertRows(
      "sale_payments",
      paymentRows(paymentsChanged) as unknown as Row[],
    );
  }
}
