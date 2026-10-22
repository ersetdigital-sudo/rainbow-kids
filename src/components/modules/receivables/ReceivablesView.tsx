"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { downloadCsv, stamp } from "@/lib/export";
import {
  arStatus,
  salePaid,
  saleProfit,
  saleTotal,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { SaleDetailDrawer } from "@/components/modules/sales/SaleDetailDrawer";
import { PayDrawer } from "./PayDrawer";
import type { ArStatus, Sale } from "@/lib/types";

const STATUSES: (ArStatus | "")[] = [
  "Belum jatuh tempo",
  "Jatuh tempo",
  "Terlambat",
  "Menunggu Pelunasan",
  "Lunas",
];

export function ReceivablesView() {
  const { db, toast } = useStore();
  const [filter, setFilter] = useState<ArStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const tempoSales = useMemo(
    () => db.sales.filter((s) => s.type === "tempo"),
    [db.sales],
  );

  const list = useMemo(
    () =>
      tempoSales
        .filter((s) => {
          const q = query.trim().toLowerCase();
          const matchQuery =
            !q ||
            s.id.toLowerCase().includes(q) ||
            s.customer.toLowerCase().includes(q);
          const matchStatus = !filter || arStatus(s) === filter;
          const matchFrom = !from || s.date >= from;
          const matchTo = !to || s.date <= to;
          return matchQuery && matchStatus && matchFrom && matchTo;
        })
        .slice()
        .reverse(),
    [tempoSales, filter, from, to, query],
  );

  const byStatus = (st: ArStatus) => tempoSales.filter((s) => arStatus(s) === st);
  const remaining = (rows: Sale[]) =>
    rows.reduce((x, s) => x + saleTotal(s) - salePaid(s), 0);

  const cards: { st: ArStatus; label: string }[] = [
    { st: "Belum jatuh tempo", label: "Belum jatuh tempo" },
    { st: "Jatuh tempo", label: "Jatuh tempo (≤3 hari)" },
    { st: "Terlambat", label: "Terlambat" },
    { st: "Lunas", label: "Lunas" },
  ];

  /** Tagihan yang masih berjalan (belum lunas) untuk ringkasan total. */
  const openStatuses: ArStatus[] = [
    "Belum jatuh tempo",
    "Jatuh tempo",
    "Terlambat",
  ];
  const openRows = tempoSales.filter((s) => openStatuses.includes(arStatus(s)));
  const totalOpen = remaining(openRows);

  const exportRows = () => {
    downloadCsv(
      `piutang-rainbow-kids-${stamp()}`,
      [
        "No. Invoice",
        "Pelanggan",
        "Tanggal",
        "Jatuh Tempo",
        "Total",
        "Dibayar",
        "Sisa",
        "Laba",
        "Status",
      ],
      list.map((s) => [
        s.id,
        s.customer,
        formatDate(s.date),
        formatDate(s.due),
        rp(saleTotal(s)),
        rp(salePaid(s)),
        rp(Math.max(saleTotal(s) - salePaid(s), 0)),
        rp(saleProfit(s)),
        arStatus(s),
      ]),
    );
    toast(`${list.length} baris piutang diekspor ke Excel`);
  };

  const columns: Column<Sale>[] = [
    {
      key: "id",
      label: "Invoice",
      render: (s) => (
        <span
          className="font-semibold cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setDetailId(s.id);
          }}
        >
          {s.id}
        </span>
      ),
    },
    { key: "customer", label: "Pelanggan", render: (s) => s.customer },
    { key: "date", label: "Tanggal", render: (s) => formatDate(s.date) },
    { key: "due", label: "Jatuh tempo", render: (s) => formatDate(s.due) },
    {
      key: "total",
      label: "Total",
      align: "right",
      render: (s) => <span className="num">{rp(saleTotal(s))}</span>,
    },
    {
      key: "paid",
      label: "Dibayar",
      align: "right",
      render: (s) => <span className="num">{rp(salePaid(s))}</span>,
    },
    {
      key: "rest",
      label: "Sisa",
      align: "right",
      render: (s) => (
        <span className="num font-semibold">
          {rp(Math.max(saleTotal(s) - salePaid(s), 0))}
        </span>
      ),
    },
    {
      key: "profit",
      label: "Laba",
      align: "right",
      render: (s) => (
        <span className="num" style={{ color: "var(--ok)" }}>
          {rp(saleProfit(s))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (s) => <Badge tone={arStatus(s)}>{arStatus(s)}</Badge>,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (s) =>
        saleTotal(s) - salePaid(s) > 0 ? (
          <button
            type="button"
            className="btn s"
            onClick={(e) => {
              e.stopPropagation();
              setPayId(s.id);
            }}
          >
            Bayar
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHead
        title="Piutang & Pembayaran"
        subtitle="Pantau tagihan tempo pelanggan dan catat pembayaran sebagian. Pelunasan butuh approval Owner."
        actions={
          <button
            type="button"
            className="btn"
            onClick={exportRows}
            disabled={list.length === 0}
          >
            Ekspor Excel
          </button>
        }
      />

      <div className="card p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-[12.5px]" style={{ color: "var(--mu)" }}>
            Total tagihan
          </div>
          <div
            className="num"
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--nv)",
              lineHeight: 1.2,
            }}
          >
            {rp(totalOpen)}
          </div>
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            {openRows.length} tagihan belum lunas
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {openStatuses.map((st) => (
            <div key={st}>
              <div
                className="text-[11.5px] uppercase tracking-wide"
                style={{ color: "var(--mu)" }}
              >
                {st}
              </div>
              <div className="num font-semibold" style={{ color: "var(--nv)" }}>
                {rp(remaining(byStatus(st)))}
              </div>
              <div className="text-[11px]" style={{ color: "var(--mu)" }}>
                {byStatus(st).length} tagihan
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {cards.map((c) => {
          const rows = byStatus(c.st);
          const value =
            c.st === "Lunas"
              ? rows.reduce((x, s) => x + saleTotal(s), 0)
              : remaining(rows);
          return (
            <button
              key={c.st}
              type="button"
              onClick={() => setFilter(filter === c.st ? "" : c.st)}
              className="card kpi p-4 text-left"
              style={
                filter === c.st
                  ? { boxShadow: "0 0 0 2px #C99300" }
                  : undefined
              }
            >
              <div className="l">{c.label}</div>
              <div className="v num">{rp(value)}</div>
              <div className="text-xs mt-1" style={{ color: "var(--mu)" }}>
                {rows.length} tagihan
              </div>
            </button>
          );
        })}
      </div>

      <div className="card mt-4">
        <div className="flex flex-wrap gap-2 p-4 items-end">
          <div className="min-w-[220px] flex-1 max-w-xs">
            <label className="f">Cari</label>
            <input
              placeholder="No. invoice / nama pelanggan"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="f">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ArStatus | "")}
            >
              <option value="">Semua</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="f">Dari tanggal</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="f">Sampai</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFilter("");
              setFrom("");
              setTo("");
              setQuery("");
            }}
          >
            Reset
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(s) => s.id}
          emptyText="Tidak ada tagihan yang cocok"
        />
      </div>

      <SaleDetailDrawer
        key={`sale-detail-${detailId ?? "none"}`}
        saleId={detailId}
        onClose={() => setDetailId(null)}
      />
      <PayDrawer
        key={`pay-drawer-${payId ?? "none"}`}
        saleId={payId}
        onClose={() => setPayId(null)}
      />
    </>
  );
}
