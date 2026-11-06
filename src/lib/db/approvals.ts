import type {
  Approval,
  ApprovalField,
  ApprovalKind,
  CostChange,
  CustomerChange,
  PurchaseRequest,
  Sale,
  SaleRequest,
  SaleRevision,
  SupplierChange,
  SupplierRequest,
} from "../types";
import {
  deleteRows,
  diffRows,
  insertRowsIfNew,
  selectAll,
  upsertRows,
  type Row,
} from "./client";

/** Rincian usulan yang disimpan sebagai satu kolom jsonb. */
type ApprovalDetail = {
  customerChanges?: CustomerChange[];
  supplierChanges?: SupplierChange[];
  costChanges?: CostChange[];
  revision?: SaleRevision;
  saleRequest?: SaleRequest;
  purchaseRequest?: PurchaseRequest;
  supplierRequest?: SupplierRequest;
  saleSnapshot?: Sale;
};

type ApprovalRow = {
  id: string;
  kind: string;
  type: string;
  vid: string | null;
  field: string | null;
  before_value: unknown;
  after_value: unknown;
  sale_id: string | null;
  purchase_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  reason: string | null;
  note: string | null;
  detail: ApprovalDetail | null;
  user_name: string | null;
  time: string | null;
  status: string;
  by_name: string | null;
  decided_at: string | null;
  ref: string | null;
  position: number;
};

function toRow(a: Approval, position: number): ApprovalRow {
  return {
    id: a.id,
    kind: a.kind,
    type: a.type,
    vid: a.vid ?? null,
    field: a.field ?? null,
    before_value: a.before ?? null,
    after_value: a.after ?? null,
    sale_id: a.saleId ?? null,
    purchase_id: a.purchaseId ?? null,
    customer_id: a.customerId ?? null,
    customer_name: a.customerName ?? null,
    supplier_id: a.supplierId ?? null,
    supplier_name: a.supplierName ?? null,
    reason: a.reason ?? null,
    note: a.note ?? null,
    detail: {
      customerChanges: a.customerChanges,
      supplierChanges: a.supplierChanges,
      costChanges: a.costChanges,
      revision: a.revision,
      saleRequest: a.saleRequest,
      purchaseRequest: a.purchaseRequest,
      supplierRequest: a.supplierRequest,
      saleSnapshot: a.saleSnapshot,
    },
    user_name: a.user,
    time: a.time,
    status: a.status,
    by_name: a.by ?? null,
    decided_at: a.decidedAt ?? null,
    ref: a.ref ?? null,
    position,
  };
}

function toApproval(r: ApprovalRow): Approval {
  const detail = r.detail ?? {};
  return {
    id: r.id,
    kind: r.kind as ApprovalKind,
    type: r.type,
    vid: r.vid ?? undefined,
    field: (r.field ?? undefined) as ApprovalField | undefined,
    before: r.before_value as string | number,
    after: r.after_value as string | number,
    saleId: r.sale_id ?? undefined,
    purchaseId: r.purchase_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    customerName: r.customer_name ?? undefined,
    supplierId: r.supplier_id ?? undefined,
    supplierName: r.supplier_name ?? undefined,
    customerChanges: detail.customerChanges,
    supplierChanges: detail.supplierChanges,
    costChanges: detail.costChanges,
    revision: detail.revision,
    saleRequest: detail.saleRequest,
    purchaseRequest: detail.purchaseRequest,
    supplierRequest: detail.supplierRequest,
    saleSnapshot: detail.saleSnapshot,
    reason: r.reason ?? undefined,
    note: r.note ?? undefined,
    user: r.user_name ?? "",
    time: r.time ?? "",
    status: r.status as Approval["status"],
    by: r.by_name ?? undefined,
    decidedAt: r.decided_at ?? undefined,
    ref: r.ref ?? undefined,
  };
}

export async function loadApprovals(): Promise<Approval[]> {
  const rows = await selectAll<ApprovalRow>("approvals");
  return rows.map(toApproval);
}

export async function saveApprovals(
  prev: Approval[],
  next: Approval[],
): Promise<void> {
  const rows = (list: Approval[]) => list.map(toRow);
  const { changed, removed } = diffRows(rows(prev), rows(next), (r) => r.id);
  await deleteRows("approvals", "id", removed);

  // RLS membedakan "membuat pengajuan" (semua role) dari "mengubah keputusan"
  // (hanya Approver/Owner), jadi baris baru memakai insert — bukan upsert yang
  // menuntut hak update.
  const before = new Set(prev.map((a) => a.id));
  const added = changed.filter((r) => !before.has(r.id));
  const updated = changed.filter((r) => before.has(r.id));
  if (added.length)
    await insertRowsIfNew("approvals", added as unknown as Row[]);
  if (updated.length) await upsertRows("approvals", updated as unknown as Row[]);
}

