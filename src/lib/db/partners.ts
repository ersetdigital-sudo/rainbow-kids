import type { Customer, CustomerStatus, CustomerType, Supplier } from "../types";
import { deleteRows, diffRows, selectAll, upsertRows, type Row } from "./client";

type CustomerRow = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  bank: string | null;
  status: string | null;
  position: number;
};

export async function loadCustomers(): Promise<Customer[]> {
  const rows = await selectAll<CustomerRow>("customers");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as CustomerType,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    bank: r.bank ?? undefined,
    status: (r.status ?? undefined) as CustomerStatus | undefined,
  }));
}

export async function saveCustomers(
  prev: Customer[],
  next: Customer[],
): Promise<void> {
  const rows = (list: Customer[]): CustomerRow[] =>
    list.map((c, index) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      phone: c.phone ?? null,
      address: c.address ?? null,
      bank: c.bank ?? null,
      status: c.status ?? null,
      position: index,
    }));

  const { changed, removed } = diffRows(rows(prev), rows(next), (r) => r.id);
  await deleteRows("customers", "id", removed);
  await upsertRows("customers", changed as unknown as Row[]);
}

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  position: number;
};

export async function loadSuppliers(): Promise<Supplier[]> {
  const rows = await selectAll<SupplierRow>("suppliers");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
  }));
}

export async function saveSuppliers(
  prev: Supplier[],
  next: Supplier[],
): Promise<void> {
  const rows = (list: Supplier[]): SupplierRow[] =>
    list.map((s, index) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      address: s.address ?? null,
      position: index,
    }));

  const { changed, removed } = diffRows(rows(prev), rows(next), (r) => r.id);
  await deleteRows("suppliers", "id", removed);
  await upsertRows("suppliers", changed as unknown as Row[]);
}
