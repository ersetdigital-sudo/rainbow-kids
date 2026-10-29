"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date";
import { num, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import { PageHead } from "@/components/ui/PageHead";
import { HistoryDetailDrawer } from "./HistoryDetailDrawer";
import {
  bucketsOf,
  groupsOf,
  movements,
  type HistoryMode,
  type HistorySide,
} from "@/lib/history";

const SIDES: [HistorySide, string, string][] = [
  ["customer", "Toko", "Toko yang memesan — siapa saja yang belanja & totalnya"],
  ["supplier", "Supplier", "Tempat kita belanja — apa saja & totalnya"],
];

export function HistoryView() {
  const { db } = useStore();
  const [side, setSide] = useState<HistorySide>("customer");
  const [mode, setMode] = useState<HistoryMode>("month");
  const [period, setPeriod] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const rows = useMemo(() => movements(db, side), [db, side]);
  const periods = useMemo(() => bucketsOf(rows, mode), [rows, mode]);
  const groups = useMemo(
    () => groupsOf(rows, mode, period || null),
    [rows, mode, period],
  );

  const unit = side === "supplier";
  const total = groups.reduce((a, g) => a + g.total, 0);
  const extra = groups.reduce((a, g) => a + g.extra, 0);
  const count = groups.reduce((a, g) => a + g.count, 0);
  const active = SIDES.find(([s]) => s === side)!;

  return (
    <>
      <PageHead
        title="Histori Toko & Supplier"
        subtitle="Siapa saja yang belanja ke kita dan apa saja yang kita belanja dari tiap supplier — rekap bulanan dan tahunan."
      />

      <div className="tabs mb-4">
        {SIDES.map(([s, label]) => (
          <button
            key={s}
            type="button"
            className={side === s ? "on" : undefined}
            onClick={() => {
              setSide(s);
              setPeriod("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-2 items-end mb-4">
        <div className="seg">
          <button
            type="button"
            className={mode === "month" ? "on" : undefined}
            onClick={() => {
              setMode("month");
              setPeriod("");
            }}
          >
            Bulanan
          </button>
          <button
            type="button"
            className={mode === "year" ? "on" : undefined}
            onClick={() => {
              setMode("year");
              setPeriod("");
            }}
          >
            Tahunan
          </button>
        </div>
        <div>
          <label className="f">
            {mode === "month" ? "Periode bulan" : "Periode tahun"}
          </label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">Semua waktu</option>
            {periods.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-[12.5px]" style={{ color: "var(--mu)" }}>
          {active[2]}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            {unit ? "Total belanja kita" : "Total penjualan"}
          </div>
          <div className="text-xl font-extrabold mt-1" style={{ color: "var(--nv)" }}>
            {rp(total)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            {unit ? "Nota pembelian" : "Transaksi"}
          </div>
          <div className="text-xl font-extrabold mt-1" style={{ color: "var(--nv)" }}>
            {num(count)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            {unit ? "Total unit masuk" : "Total laba"}
          </div>
          <div
            className="text-xl font-extrabold mt-1"
            style={{ color: unit ? "var(--nv)" : "var(--ok)" }}
          >
            {unit ? `${num(extra)} unit` : rp(extra)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-5 pt-5 pb-3 font-bold flex flex-wrap items-center gap-2">
          <span>Peringkat {unit ? "supplier" : "toko"}</span>
          <span className="text-xs font-normal" style={{ color: "var(--mu)" }}>
            {period
              ? periods.find((b) => b.key === period)?.label
              : "semua waktu"}{" "}
            · {groups.length} {unit ? "supplier" : "toko"}
          </span>
        </div>
        {groups.length === 0 && (
          <div className="px-5 pb-6 text-[13px]" style={{ color: "var(--mu)" }}>
            Belum ada data pada periode ini.
          </div>
        )}
        {groups.map((g, i) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setDetail(g.name)}
            className="w-full text-left px-5 py-3 border-t flex items-center gap-3"
            style={{ borderColor: "#EEF1F6" }}
          >
            <span
              className="num text-xs font-bold w-5 text-center"
              style={{ color: "var(--mu)" }}
            >
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[13.5px]" style={{ color: "var(--nv)" }}>
                {g.name}
              </span>
              <span className="block text-[11.5px]" style={{ color: "var(--mu)" }}>
                {g.count} {unit ? "nota" : "transaksi"} · terakhir{" "}
                {formatDate(g.last)}
                {unit ? ` · ${num(g.extra)} unit` : ` · laba ${rp(g.extra)}`}
              </span>
              <span
                className="block mt-1.5 rounded-full"
                style={{
                  height: 4,
                  background: "#EEF1F6",
                  overflow: "hidden",
                }}
              >
                <span
                  className="block h-full"
                  style={{
                    width: `${total ? Math.max((g.total / total) * 100, 2) : 0}%`,
                    background: "var(--nv)",
                  }}
                />
              </span>
            </span>
            <span className="text-right whitespace-nowrap">
              <span className="block num font-bold text-[13.5px]" style={{ color: "var(--nv)" }}>
                {rp(g.total)}
              </span>
              <span className="block text-[11px]" style={{ color: "var(--mu)" }}>
                {total ? `${((g.total / total) * 100).toFixed(1)}%` : "0%"}
              </span>
            </span>
          </button>
        ))}
      </div>

      <HistoryDetailDrawer
        key={`history-detail-${side}-${detail ?? "none"}`}
        side={side}
        name={detail}
        onClose={() => setDetail(null)}
      />
    </>
  );
}
