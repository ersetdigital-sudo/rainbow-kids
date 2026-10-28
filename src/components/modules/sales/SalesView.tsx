"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { downloadCsv, stamp } from "@/lib/export";
import {
  arStatus,
  overdueSales,
  saleCost,
  saleOps,
  salePaid,
  saleProfit,
  saleTotal,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { SaleDetailDrawer } from "./SaleDetailDrawer";
import { SaleFormDrawer } from "./SaleFormDrawer";
import type { Sale } from "@/lib/types";

type PayFilter = "all" | "lunas" | "belum";

export function SalesView() {
  const { db, toast } = useStore();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [pay, setPay] = useState<PayFilter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = useMemo(
    () =>
      db.sales
        .filter((s) => {
          const q = query.trim().toLowerCase();
          const matchQuery =
            !q ||
            s.id.toLowerCase().includes(q) ||
            s.customer.toLowerCase().includes(q);
          const matchType = !type || s.type === type;
          const status = arStatus(s);
          const matchPay =
            pay === "all" ||
            (pay === "lunas" && status === "Lunas") ||
            (pay === "belum" && status !== "Lunas");
          return matchQuery && matchType && matchPay;
        })
        .slice()
        .reverse(),
    [db.sales, query, type, pay],
  );

  /** Data pelanggan terbaru untuk kolom kontak & rekening di file ekspor. */
  const customerOf = (s: Sale) =>
    db.customers.find((c) => c.id === s.customerId) ??
    db.customers.find((c) => c.name === s.customer);

  const hasPendingDelete = (s: Sale) =>
    db.approvals.some(
      (a) =>
        a.kind === "saleDelete" &&
        a.saleId === s.id &&
        a.status === "Menunggu",
    );

  const hasOverdue = (s: Sale) =>
    overdueSales(db, { id: s.customerId, name: s.customer }).length > 0;

  const exportRows = () => {
    downloadCsv(
      `penjualan-rainbow-kids-${stamp()}`,
      [
        "No. Invoice",
        "Tanggal order",
        "Jatuh tempo",
        "Pelanggan",
        "No. HP",
        "Alamat",
        "Tujuan Transfer",
        "Jenis",
        "Total",
        "Modal",
        "Biaya Ops",
        "Laba",
        "Dibayar",
        "Sisa",
        "Status",
      ],
      list.map((s) => [
        s.id,
        formatDate(s.date),
        s.due ? formatDate(s.due) : "-",
        s.customer,
        customerOf(s)?.phone?.trim() || "-",
        customerOf(s)?.address?.trim() || "-",
        customerOf(s)?.bank?.trim() || "-",
        s.type === "tempo" ? "Tempo" : "Tunai",
        rp(saleTotal(s)),
        rp(saleCost(s)),
        rp(saleOps(s)),
        rp(saleProfit(s)),
        rp(salePaid(s)),
        rp(Math.max(saleTotal(s) - salePaid(s), 0)),
        arStatus(s),
      ]),
    );
    toast(`${list.length} baris diekspor ke Excel`);
  };

  const columns: Column<Sale>[] = [
    {
      key: "id",
      label: "No. Invoice",
      render: (s) => (
        <div>
          <span className="font-semibold">{s.id}</span>
          {hasPendingDelete(s) && (
            <div>
              <span className="bd b-er mt-1">Pengajuan hapus</span>
            </div>
          )}
        </div>
      ),
    },
    { key: "date", label: "Tanggal", render: (s) => formatDate(s.date) },
    {
      key: "customer",
      label: "Pelanggan",
      cellClass: "h-wrap",
      render: (s) => (
        <div>
          <div>{s.customer}</div>
          {hasOverdue(s) && (
            <span className="bd b-er mt-1">Ada tunggakan</span>
          )}
        </div>
      ),
    },
    {
      key: "total",
      label: "Total jual",
      align: "right",
      render: (s) => <span className="num">{rp(saleTotal(s))}</span>,
    },
    {
      key: "status",
      label: "Status bayar",
      render: (s) => <Badge tone={arStatus(s)}>{arStatus(s)}</Badge>,
    },
  ];

  return (
    <>
      <PageHead
        title="Penjualan"
        subtitle="Catat transaksi tunai & tempo, lengkap dengan laba per order."
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={exportRows}
              disabled={list.length === 0}
            >
              Ekspor Excel
            </button>
            <button
              type="button"
              className="btn p"
              onClick={() => setFormOpen(true)}
            >
              + Transaksi baru
            </button>
          </>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 p-4">
          <input
            className="max-w-xs"
            placeholder="Cari no. invoice / pelanggan"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="max-w-[190px]"
            value={pay}
            onChange={(e) => setPay(e.target.value as PayFilter)}
            aria-label="Filter status pembayaran"
          >
            <option value="all">Semua status bayar</option>
            <option value="lunas">Lunas</option>
            <option value="belum">Belum lunas</option>
          </select>
          <select
            className="max-w-[160px]"
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter jenis pembayaran"
          >
            <option value="">Semua jenis</option>
            <option value="tunai">Tunai</option>
            <option value="tempo">Tempo</option>
          </select>
        </div>
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(s) => s.id}
          onRowClick={(s) => setDetailId(s.id)}
          emptyText="Tidak ada transaksi yang cocok"
        />
      </div>

      <SaleFormDrawer
        key={`sale-form-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      <SaleDetailDrawer
        key={`sale-detail-${detailId ?? "none"}`}
        saleId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
