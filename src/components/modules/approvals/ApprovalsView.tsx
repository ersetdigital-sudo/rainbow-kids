"use client";

import { useMemo, useState } from "react";
import { rp } from "@/lib/format";
import { paymentPosition, saleRequestPosition, variantLabel } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { ApprovalDetailDrawer } from "./ApprovalDetailDrawer";
import type { Approval, PaymentPosition } from "@/lib/types";

const FILTERS = ["Menunggu", "Disetujui", "Ditolak", "Semua"] as const;
type Filter = (typeof FILTERS)[number];

export function ApprovalsView() {
  const { db, decideApproval, toast } = useStore();
  const [filter, setFilter] = useState<Filter>("Menunggu");
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      db.approvals
        .filter((a) => filter === "Semua" || a.status === filter)
        .slice()
        .reverse(),
    [db.approvals, filter],
  );

  /** Label objek yang diubah: varian, invoice, atau pembelian. */
  const subject = (a: Approval) => {
    if (a.kind === "payment") {
      const s = db.sales.find((x) => x.id === a.saleId);
      return s ? `${s.id} · ${s.customer}` : (a.saleId ?? "-");
    }
    if (a.kind === "purchase") {
      const p = db.purchases.find((x) => x.id === a.purchaseId);
      return p ? `${p.id} · ${p.supplier}` : (a.purchaseId ?? "-");
    }
    if (a.kind === "sale") {
      const s = db.sales.find((x) => x.id === a.saleId);
      return s ? `${s.id} · ${s.customer}` : (a.saleId ?? "-");
    }
    if (a.kind === "invoice") {
      const s = db.sales.find((x) => x.id === a.saleId);
      if (s) return `${s.id} · ${s.customer}`;
      return `Invoice baru · ${a.saleRequest?.customer ?? "-"}`;
    }
    if (a.kind === "nota") {
      const p = db.purchases.find((x) => x.id === a.purchaseId);
      if (p) return `Nota ${p.nota} · ${p.supplier}`;
      if (a.purchaseRequest)
        return `Nota baru ${a.purchaseRequest.nota} · ${a.purchaseRequest.supplier}`;
      return a.purchaseId ?? "-";
    }
    if (a.kind === "notaEdit") {
      const p = db.purchases.find((x) => x.id === a.purchaseId);
      return `Revisi nota ${a.purchaseRequest?.nota ?? p?.nota ?? "-"} · ${a.purchaseRequest?.supplier ?? p?.supplier ?? "-"}`;
    }
    return variantLabel(db, a.vid ?? "");
  };

  /** Posisi tagihan invoice terkait: lunas / belum lunas / belum jatuh tempo. */
  const position = (a: Approval): PaymentPosition | null => {
    if (a.kind === "invoice")
      return a.saleRequest ? saleRequestPosition(a.saleRequest) : null;
    if (a.kind === "payment" || a.kind === "sale") {
      const s = db.sales.find((x) => x.id === a.saleId);
      return s ? paymentPosition(s) : null;
    }
    return null;
  };

  const fmt = (a: Approval, v: string | number) => {
    if (a.field === "name") return String(v);
    if (a.kind === "purchase") return String(v);
    if (a.kind === "payment") return rp(Number(v));
    return rp(Number(v));
  };

  const columns: Column<Approval>[] = [
    {
      key: "id",
      label: "ID",
      render: (a) => <span className="font-semibold">{a.id}</span>,
    },
    { key: "time", label: "Waktu", render: (a) => a.time },
    { key: "type", label: "Perubahan", render: (a) => a.type },
    { key: "vid", label: "Objek", render: (a) => subject(a) },
    {
      key: "position",
      label: "Posisi tagihan",
      render: (a) => {
        const pos = position(a);
        return pos ? (
          <Badge tone={pos}>{pos}</Badge>
        ) : (
          <span style={{ color: "var(--mu)" }}>—</span>
        );
      },
    },
    {
      key: "before",
      label: "Sebelum",
      render: (a) => (
        <span style={{ color: "var(--mu)" }}>
          {a.kind === "invoice" ? "—" : <s>{fmt(a, a.before)}</s>}
        </span>
      ),
    },
    {
      key: "after",
      label: "Sesudah",
      render: (a) => <span className="font-semibold">{fmt(a, a.after)}</span>,
    },
    { key: "user", label: "Diajukan", render: (a) => a.user },
    {
      key: "status",
      label: "Status",
      render: (a) => (
        <div>
          <Badge tone={a.status}>{a.status}</Badge>
          {a.by && (
            <div className="text-[11px] mt-0.5" style={{ color: "var(--mu)" }}>
              oleh {a.by}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (a) => (
        <div className="flex gap-1 justify-end">
          {(a.kind === "nota" ||
            a.kind === "notaEdit" ||
            a.kind === "purchase" ||
            a.kind === "sale" ||
            a.kind === "invoice") && (
            <button
              type="button"
              className="btn s"
              onClick={(e) => {
                e.stopPropagation();
                setDetailId(a.id);
              }}
            >
              Detail
            </button>
          )}
          {a.status === "Menunggu" && (
            <>
              <button
                type="button"
                className="btn s d"
                onClick={() => {
                  decideApproval(a.id, false);
                  toast("Pengajuan ditolak");
                }}
              >
                Tolak
              </button>
              <button
                type="button"
                className="btn s p"
                onClick={() => {
                  decideApproval(a.id, true);
                  toast(
                    a.kind === "invoice"
                      ? "Invoice disetujui — transaksi tercatat & stok berkurang"
                      : a.kind === "payment"
                        ? "Pelunasan disetujui — invoice menjadi Lunas"
                        : a.kind === "purchase"
                          ? "Status pembelian disetujui menjadi Lunas"
                          : a.kind === "notaEdit"
                            ? "Revisi nota disetujui — stok & harga modal diperbarui"
                          : a.kind === "nota"
                            ? "Nota disetujui — harga beli diperbarui"
                            : a.kind === "sale"
                              ? "Harga & biaya invoice disetujui"
                              : "Perubahan disetujui & diterapkan",
                  );
                }}
              >
                Setujui
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Approval & Audit Log"
        subtitle="Invoice penjualan baru, izin belanja nota supplier, harga & biaya invoice, pelunasan, dan perubahan data varian — lengkap sebelum & sesudah, termasuk laba setiap barang."
      />

      <div className="tabs mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "on" : undefined}
            onClick={() => setFilter(f)}
          >
            {f}{" "}
            <span className="text-xs">
              (
              {f === "Semua"
                ? db.approvals.length
                : db.approvals.filter((a) => a.status === f).length}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(a) => a.id}
          emptyText="Tidak ada data"
        />
      </div>

      <ApprovalDetailDrawer
        key={`approval-detail-${detailId ?? "none"}`}
        approvalId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
