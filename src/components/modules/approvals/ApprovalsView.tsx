"use client";

import { useMemo, useState } from "react";
import { rp } from "@/lib/format";
import { variantLabel } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import type { Approval } from "@/lib/types";

const FILTERS = ["Menunggu", "Disetujui", "Ditolak", "Semua"] as const;
type Filter = (typeof FILTERS)[number];

export function ApprovalsView() {
  const { db, decideApproval, toast } = useStore();
  const [filter, setFilter] = useState<Filter>("Menunggu");

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
    return variantLabel(db, a.vid ?? "");
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
      key: "before",
      label: "Sebelum",
      render: (a) => (
        <span style={{ color: "var(--mu)" }}>
          <s>{fmt(a, a.before)}</s>
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
      render: (a) =>
        a.status === "Menunggu" ? (
          <div className="flex gap-1 justify-end">
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
                  a.kind === "payment"
                    ? "Pelunasan disetujui — invoice menjadi Lunas"
                    : a.kind === "purchase"
                      ? "Status pembelian disetujui menjadi Lunas"
                      : "Perubahan disetujui & diterapkan",
                );
              }}
            >
              Setujui
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHead
        title="Approval & Audit Log"
        subtitle="Harga, nama varian, pelunasan invoice, dan status pembayaran pembelian tercatat lengkap sebelum & sesudah."
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
    </>
  );
}
