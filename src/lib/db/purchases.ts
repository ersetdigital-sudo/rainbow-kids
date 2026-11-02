import type { Purchase, PurchaseItem, PurchasePayStatus } from "../types";
import { deleteRows, diffRows, same, selectAll, upsertRows, type Row } from "./client";

type PurchaseRow = {
  id: string;
  nota: string;
  supplier: string;
  date: string;
  pay_status: string;
  position: number;
};

type ItemRow = {
  purchase_id: string;
  position: number;
  vid: string;
  qty: number;
  cost: number;
};

function purchaseRows(purchases: Purchase[]): PurchaseRow[] {
  return purchases.map((p, index) => ({
    id: p.id,
    nota: p.nota,
    supplier: p.supplier,
    date: p.date,
    pay_status: p.payStatus,
    position: index,
  }));
}

function itemRows(purchases: Purchase[]): ItemRow[] {
  return purchases.flatMap((p) =>
    p.items.map((i, index) => ({
      purchase_id: p.id,
      position: index,
      vid: i.vid,
      qty: i.qty,
      cost: i.cost,
    })),
  );
}

export async function loadPurchases(): Promise<Purchase[]> {
  const [purchases, items] = await Promise.all([
    selectAll<PurchaseRow>("purchases"),
    selectAll<ItemRow>("purchase_items"),
  ]);

  const itemsByPurchase = new Map<string, PurchaseItem[]>();
  for (const i of items) {
    const list = itemsByPurchase.get(i.purchase_id) ?? [];
    list.push({ vid: i.vid, qty: Number(i.qty), cost: Number(i.cost) });
    itemsByPurchase.set(i.purchase_id, list);
  }

  return purchases.map((p) => ({
    id: p.id,
    nota: p.nota,
    supplier: p.supplier,
    date: p.date,
    payStatus: p.pay_status as PurchasePayStatus,
    items: itemsByPurchase.get(p.id) ?? [],
  }));
}

export async function savePurchases(
  prev: Purchase[],
  next: Purchase[],
): Promise<void> {
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const header = diffRows(purchaseRows(prev), purchaseRows(next), (r) => r.id);

  await upsertRows("purchases", header.changed as unknown as Row[]);
  await deleteRows("purchases", "id", header.removed);

  const itemsChanged = next.filter((p) => {
    const before = prevById.get(p.id);
    return !before || !same(itemRows([before]), itemRows([p]));
  });
  if (itemsChanged.length) {
    await deleteRows(
      "purchase_items",
      "purchase_id",
      itemsChanged.map((p) => p.id),
    );
    await upsertRows(
      "purchase_items",
      itemRows(itemsChanged) as unknown as Row[],
    );
  }
}
