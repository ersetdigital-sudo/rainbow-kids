"use client";

import { formatDate } from "@/lib/date";
import { num, rp } from "@/lib/format";
import { variantLabel } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import {
  bucketsOf,
  itemsOf,
  movements,
  type HistorySide,
} from "@/lib/history";

/** Histori lengkap satu toko (belanja) atau satu supplier (nota belanja). */
export function HistoryDetailDrawer({
  side,
  name,
  onClose,
}: {
  side: HistorySide;
  name: string | null;
  onClose: () => void;
}) {
  const { db } = useStore();
  if (!name) return null;

  const rows = movements(db, side)
    .filter((r) => r.name === name)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthly = bucketsOf(rows, "month");
  const yearly = bucketsOf(rows, "year");
  const items = itemsOf(rows);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const extra = rows.reduce((a, r) => a + r.extra, 0);
  const unit = side === "supplier";
  const label = side === "customer" ? "Toko" : "Supplier";

  return (
    <Drawer
      open={Boolean(name)}
      onClose={onClose}
      wide
      title={`Histori ${label}`}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Tutup
        </button>
      }
    >
      <div className="sdtop">
        <div>
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            {rows.length} {unit ? "nota pembelian" : "transaksi"} tercatat
          </div>
          <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
            {name}
          </div>
        </div>
        <Badge tone={unit ? "Tempo" : "Tunai"}>{label}</Badge>
      </div>

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">Σ</span>
          <span>Ringkasan</span>
        </div>
        <div className="text-[13px]">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>
              Total {unit ? "belanja kita" : "belanja"}
            </span>
            <b className="num" style={{ color: "var(--nv)" }}>
              {rp(total)}
            </b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>
              {unit ? "Total unit masuk" : "Total laba"}
            </span>
            <b
              className="num"
              style={{ color: unit ? "var(--nv)" : "var(--ok)" }}
            >
              {unit ? `${num(extra)} unit` : rp(extra)}
            </b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Rata-rata per nota</span>
            <span className="num">{rp(rows.length ? total / rows.length : 0)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Terakhir</span>
            <span className="num">{formatDate(rows[0]?.date)}</span>
          </div>
        </div>
      </div>

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">▤</span>
          <span>Per bulan</span>
        </div>
        {monthly.map((b) => (
          <div
            key={b.key}
            className="flex justify-between items-center gap-3 py-2 border-b text-[13px]"
            style={{ borderColor: "var(--ln)" }}
          >
            <div>
              <div className="font-semibold" style={{ color: "var(--nv)" }}>
                {b.label}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                {b.count} {unit ? "nota" : "transaksi"} ·{" "}
                {unit ? `${num(b.extra)} unit` : `laba ${rp(b.extra)}`}
              </div>
            </div>
            <b className="num whitespace-nowrap">{rp(b.total)}</b>
          </div>
        ))}
      </div>

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">▦</span>
          <span>Per tahun</span>
        </div>
        {yearly.map((b) => (
          <div
            key={b.key}
            className="flex justify-between items-center gap-3 py-2 border-b text-[13px]"
            style={{ borderColor: "var(--ln)" }}
          >
            <div>
              <div className="font-semibold" style={{ color: "var(--nv)" }}>
                {b.label}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                {b.count} {unit ? "nota" : "transaksi"}
              </div>
            </div>
            <b className="num whitespace-nowrap">{rp(b.total)}</b>
          </div>
        ))}
      </div>

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">📦</span>
          <span>{unit ? "Barang yang kita beli" : "Barang yang dibeli"}</span>
          <span className="ml-auto text-[12px] font-semibold" style={{ color: "var(--mu)" }}>
            {items.length} varian
          </span>
        </div>
        {items.map((i) => (
          <div
            key={i.vid}
            className="flex justify-between gap-3 py-2 border-b text-[13px]"
            style={{ borderColor: "var(--ln)" }}
          >
            <div className="min-w-0">
              <div className="font-semibold" style={{ color: "var(--nv)" }}>
                {variantLabel(db, i.vid)}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                {num(i.qty)} unit
              </div>
            </div>
            <b className="num whitespace-nowrap">{rp(i.value)}</b>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
