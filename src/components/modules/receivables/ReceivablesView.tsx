"use client";

import { useMemo, useState } from "react";
import { formatDate, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import { downloadCsv, stamp } from "@/lib/export";
import { arStatus, salePaid, saleProfit, saleTotal } from "@/lib/calc";
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

/** Legenda ringkasan tagihan: tiga status berjalan + lunas. */
const LEGEND: { st: ArStatus; color: string }[] = [
  { st: "Belum jatuh tempo", color: "#FEC40B" },
  { st: "Jatuh tempo", color: "#F59E0B" },
  { st: "Terlambat", color: "#EF4444" },
  { st: "Lunas", color: "#22C55E" },
];

const dayDiff = (date: string) =>
  Math.round(
    (new Date(`${TODAY}T00:00`).getTime() - new Date(`${date}T00:00`).getTime()) /
      86400000,
  );

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

  /** Tagihan yang masih berjalan (belum lunas) untuk ringkasan total. */
  const openStatuses: ArStatus[] = [
    "Belum jatuh tempo",
    "Jatuh tempo",
    "Terlambat",
  ];
  const openRows = tempoSales.filter((s) => openStatuses.includes(arStatus(s)));
  const totalOpen = remaining(openRows);

  const totalTempo = tempoSales.reduce((x, s) => x + saleTotal(s), 0);
  const collected = tempoSales.reduce((x, s) => x + salePaid(s), 0);
  const pctCollected = totalTempo ? Math.round((collected / totalTempo) * 100) : 0;

  const legendValue = (st: ArStatus) =>
    st === "Lunas"
      ? byStatus(st).reduce((x, s) => x + saleTotal(s), 0)
      : remaining(byStatus(st));

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
    {
      key: "customer",
      label: "Pelanggan",
      render: (s) => (
        <div>
          <div className="font-medium">{s.customer}</div>
          <div className="text-[11px]" style={{ color: "var(--mu)" }}>
            Order {formatDate(s.date)}
          </div>
        </div>
      ),
    },
    {
      key: "due",
      label: "Jatuh tempo",
      render: (s) => {
        const late = s.due ? dayDiff(s.due) : 0;
        return (
          <div>
            <div>{formatDate(s.due)}</div>
            {late > 0 && arStatus(s) !== "Lunas" && (
              <div className="text-[11px] font-semibold" style={{ color: "var(--er)" }}>
                lewat {late} hari
              </div>
            )}
            {late <= 0 && late >= -3 && arStatus(s) !== "Lunas" && (
              <div className="text-[11px] font-semibold" style={{ color: "var(--wa)" }}>
                ≤ {Math.abs(late)} hari lagi
              </div>
            )}
          </div>
        );
      },
    },
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
        subtitle="Pantau tagihan tempo, catat pembayaran sebagian, dan ajukan pelunasan ke Owner."
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

      {/* Ringkasan tagihan */}
      <section className="ar-hero">
        <div>
          <div className="ar-kicker">Total tagihan berjalan</div>
          <div className="ar-total num">{rp(totalOpen)}</div>
          <div className="ar-chips">
            <span className="ar-chip">{openRows.length} invoice terbuka</span>
            <span className="ar-chip">
              {byStatus("Terlambat").length} terlambat
            </span>
            <span className="ar-chip">{rp(collected)} sudah tertagih</span>
          </div>
          <div className="ar-progress">
            <div className="ar-progress-head">
              <span>Progress penagihan</span>
              <span className="num">{pctCollected}%</span>
            </div>
            <div className="ar-progress-track">
              <span style={{ width: `${pctCollected}%` }} />
            </div>
          </div>
        </div>

        <div className="ar-legend">
          {LEGEND.map((l) => {
            const rows = byStatus(l.st);
            const value = legendValue(l.st);
            const share =
              l.st === "Lunas" || totalOpen <= 0
                ? 0
                : Math.min((value / totalOpen) * 100, 100);
            const on = filter === l.st;
            return (
              <button
                key={l.st}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(on ? "" : l.st)}
                className={`ar-legend-item${on ? " on" : ""}`}
                style={{ ["--dc" as string]: l.color }}
              >
                <span className="ar-legend-dot" aria-hidden="true" />
                <span className="ar-legend-body">
                  <span className="ar-legend-label">{l.st}</span>
                  <span className="ar-legend-bar" aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </span>
                </span>
                <span className="ar-legend-num">
                  <span className="num">{rp(value)}</span>
                  <span className="ar-legend-count">{rows.length} tagihan</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daftar tagihan */}
      <div className="card mt-4">
        <div className="ar-listhead">
          <div>
            <div className="font-bold" style={{ color: "var(--nv)" }}>
              Daftar tagihan tempo
            </div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {list.length} dari {tempoSales.length} invoice tempo
            </div>
          </div>
          <span className="ar-note">Pelunasan butuh approval Owner</span>
        </div>

        <div className="ar-toolbar">
          <div className="ar-search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Cari no. invoice / nama pelanggan"
              aria-label="Cari tagihan"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ar-dates">
            <label>
              Dari tanggal
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Sampai
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn s"
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

        <div className="ar-pills">
          <button
            type="button"
            className={filter === "" ? "on" : undefined}
            onClick={() => setFilter("")}
          >
            Semua <b>{tempoSales.length}</b>
          </button>
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              className={filter === st ? "on" : undefined}
              onClick={() => setFilter(st)}
            >
              {st} <b>{byStatus(st as ArStatus).length}</b>
            </button>
          ))}
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
