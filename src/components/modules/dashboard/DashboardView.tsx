"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { addDays, formatDate, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import { allV, arStatus, salePaid, saleProfit, saleTotal } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Gauge } from "@/components/dashboard/Gauge";
import { PerfChart } from "@/components/dashboard/PerfChart";
import { SaleDetailDrawer } from "@/components/modules/sales/SaleDetailDrawer";
import { SaleFormDrawer } from "@/components/modules/sales/SaleFormDrawer";
import { PurchaseFormDrawer } from "@/components/modules/purchases/PurchaseDrawers";

/** Animasi masuk untuk kartu-kartu section dashboard. */
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: "easeOut" as const },
});

export function DashboardView() {
  const { db } = useStore();
  const [saleOpen, setSaleOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");

  const today = useMemo(
    () => db.sales.filter((s) => s.date === TODAY),
    [db.sales],
  );
  const month = useMemo(
    () => db.sales.filter((s) => s.date.slice(0, 7) === TODAY.slice(0, 7)),
    [db.sales],
  );

  const sum = (rows: typeof db.sales, f: (s: (typeof db.sales)[number]) => number) =>
    rows.reduce((x, s) => x + f(s), 0);

  const variants = useMemo(() => allV(db), [db]);
  const stock = variants.reduce((a, v) => a + v.stock, 0);
  const stockVal = variants.reduce((a, v) => a + v.stock * v.cost, 0);
  const open = db.sales.filter((s) => arStatus(s) !== "Lunas");
  const ar = sum(
    open,
    (s) => saleTotal(s) - salePaid(s),
  );
  const due = open.filter((s) =>
    ["Jatuh tempo", "Terlambat"].includes(arStatus(s)),
  );

  const minusStock = variants.filter((v) => v.stock < 0);
  const lowStock = variants.filter((v) => v.stock >= 0 && v.stock < 15);

  const days = useMemo(
    () => [...Array(14)].map((_, i) => addDays(TODAY, i - 13)),
    [],
  );
  const vals = days.map((d) =>
    sum(
      db.sales.filter((s) => s.date === d),
      saleTotal,
    ),
  );
  const total14 = vals.reduce((a, b) => a + b, 0);

  const low = variants.filter((v) => v.stock < 15);
  const pending = db.approvals.filter((a) => a.status === "Menunggu").length;

  const yesterday = sum(
    db.sales.filter((s) => s.date === addDays(TODAY, -1)),
    saleTotal,
  );
  const td = sum(today, saleTotal);
  const pm = addDays(TODAY, -30).slice(0, 7);
  const dd = TODAY.slice(8);
  const prevRows = db.sales.filter(
    (s) => s.date.slice(0, 7) === pm && s.date.slice(8) <= dd,
  );
  const prev = sum(prevRows, saleTotal);
  const prevProfit = sum(prevRows, saleProfit);
  const prevMonthTotal = sum(
    db.sales.filter((s) => s.date.slice(0, 7) === pm),
    saleTotal,
  );
  const mt = sum(month, saleTotal);
  const pf = sum(month, saleProfit);
  const margin = mt ? (pf / mt) * 100 : 0;
  const tr = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

  const rows = useMemo(() => {
    const key = q.trim().toLowerCase();
    let list = db.sales.slice();
    if (key) {
      list = list.filter(
        (s) =>
          s.customer.toLowerCase().includes(key) ||
          s.id.toLowerCase().includes(key),
      );
    }
    if (sort === "total") list.sort((a, b) => saleTotal(b) - saleTotal(a));
    else if (sort === "laba") list.sort((a, b) => saleProfit(b) - saleProfit(a));
    else list.reverse();
    return list.slice(0, 6);
  }, [db.sales, q, sort]);

  const arGroups: [string, number, string][] = [
    [
      "Terlambat",
      sum(
        open.filter((s) => arStatus(s) === "Terlambat"),
        (s) => saleTotal(s) - salePaid(s),
      ),
      "#EF4444",
    ],
    [
      "Jatuh tempo",
      sum(
        open.filter((s) => arStatus(s) === "Jatuh tempo"),
        (s) => saleTotal(s) - salePaid(s),
      ),
      "#F59E0B",
    ],
    [
      "Menunggu pelunasan",
      sum(
        open.filter((s) => arStatus(s) === "Menunggu Pelunasan"),
        (s) => saleTotal(s) - salePaid(s),
      ),
      "#7A5800",
    ],
    [
      "Belum jatuh tempo",
      sum(
        open.filter((s) => arStatus(s) === "Belum jatuh tempo"),
        (s) => saleTotal(s) - salePaid(s),
      ),
      "#04123F",
    ],
  ];

  const countTrend = tr(month.length, prevRows.length);

  return (
    <>
      <div className="d2">
        <div className="d2-head">
          <div>
            <div className="d2-title">Dashboard</div>
            <div className="d2-sub">
              Ringkasan usaha per {formatDate(TODAY)}
            </div>
          </div>
          <div className="d2-controls">
            <span className="d2-period">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
              Bulan ini
            </span>
            <button
              type="button"
              className="d2-ghost"
              onClick={() => setPurchaseOpen(true)}
            >
              + Pembelian
            </button>
            <button
              type="button"
              className="d2-pill"
              onClick={() => setSaleOpen(true)}
            >
              + Penjualan baru
            </button>
          </div>
        </div>

        {(minusStock.length > 0 || lowStock.length > 0) && (
          <div
            className="card p-4 mb-4"
            style={{
              borderColor: minusStock.length ? "#f3c2c2" : "#f6e4a6",
              background: minusStock.length ? "#FDECEC" : "#FFF8DB",
            }}
          >
            <div
              className="font-bold text-[14px]"
              style={{ color: minusStock.length ? "var(--er)" : "var(--wa)" }}
            >
              ⚠ Peringatan restock —{" "}
              {minusStock.length > 0
                ? `${minusStock.length} varian stok minus`
                : `${lowStock.length} varian stok menipis`}
            </div>
            <div className="text-[12.5px] mt-1" style={{ color: "var(--tx)" }}>
              {minusStock.length > 0 && (
                <div>
                  <b>Stok minus</b> (terjual melebihi stok sistem):{" "}
                  {minusStock
                    .map((v) => `${v.pname} · ${v.name} (${v.stock})`)
                    .join(", ")}
                </div>
              )}
              {lowStock.length > 0 && (
                <div>
                  <b>Stok menipis</b> (di bawah 15):{" "}
                  {lowStock
                    .map((v) => `${v.pname} · ${v.name} (${v.stock})`)
                    .join(", ")}
                </div>
              )}
            </div>
            <Link href="/stock" className="d2-ghost mt-3 !inline-flex">
              Kelola stok &amp; buat pembelian →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Omzet bulan ini"
            value={rp(mt)}
            count={mt}
            format={(n) => rp(Math.round(n))}
            sub={`Bulan lalu ${rp(prevMonthTotal)}`}
            icon="wallet"
            accent="#2463FF"
            tint="#EEF3FF"
            trend={tr(mt, prev)}
            delay={0}
          />
          <KpiCard
            label="Omzet hari ini"
            value={rp(td)}
            count={td}
            format={(n) => rp(Math.round(n))}
            sub={`${today.length} transaksi · kemarin ${rp(yesterday)}`}
            icon="trend"
            accent="#2463FF"
            tint="#EEF3FF"
            trend={tr(td, yesterday)}
            delay={0.06}
          />
          <KpiCard
            label="Estimasi laba"
            value={rp(pf)}
            count={pf}
            format={(n) => rp(Math.round(n))}
            sub={`Margin ${Math.round(margin)}% setelah biaya`}
            icon="spark"
            accent="#2463FF"
            tint="#EEF3FF"
            delay={0.12}
          />
          <KpiCard
            label="Total stok"
            value={`${stock.toLocaleString("id-ID")} unit`}
            count={stock}
            format={(n) => `${Math.round(n).toLocaleString("id-ID")} unit`}
            sub={`Nilai modal ${rp(stockVal)} · ${low.length} varian menipis`}
            icon="box"
            accent="#2463FF"
            tint="#EEF3FF"
            delay={0.18}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <motion.div className="d2-card lg:col-span-2" {...fadeUp(0.24)}>
            <div className="d2-card-h">
              <div>
                <div className="d2-card-t">Performa penjualan</div>
                <div className="d2-card-s">
                  Total <b style={{ color: "#111" }}>{rp(total14)}</b> ·
                  rata-rata {rp(total14 / 14)}/hari
                </div>
              </div>
              <span className="d2-chip">14 hari</span>
            </div>
            <div className="px-2 pb-3 pt-1">
              <PerfChart days={days} values={vals} />
            </div>
          </motion.div>

          <motion.div className="d2-card" {...fadeUp(0.3)}>
            <div className="d2-card-h">
              <div>
                <div className="d2-card-t">Ringkasan bulan ini</div>
                <div className="d2-card-s">
                  {month.length} transaksi tercatat
                </div>
              </div>
              <span className="d2-chip">Laba</span>
            </div>
            <div className="px-5">
              <div className="d2-gauge">
                <Gauge percent={margin} caption="rasio laba" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <div className="d2-metric">
                <div className="d2-metric-l">Jumlah transaksi</div>
                <div className="d2-metric-row">
                  <div className="d2-metric-v num">
                    {month.length.toLocaleString("id-ID")}
                  </div>
                  <span className={`d2-trend ${countTrend < 0 ? "dn" : ""}`}>
                    {countTrend >= 0 ? "↑" : "↓"} {Math.abs(countTrend)}%
                  </span>
                </div>
              </div>
              <div className="d2-metric">
                <div className="d2-metric-l">Total laba</div>
                <div className="d2-metric-row">
                  <div className="d2-metric-v num">{rp(pf)}</div>
                  <span
                    className={`d2-trend ${tr(pf, prevProfit) < 0 ? "dn" : ""}`}
                  >
                    {tr(pf, prevProfit) >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(tr(pf, prevProfit))}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div className="d2-card mt-4" {...fadeUp(0.36)}>
          <div className="d2-card-h d2-c">
            <div>
              <div className="d2-card-t">Transaksi terbaru</div>
              <div className="d2-card-s">
                {rows.length} dari {db.sales.length} transaksi
              </div>
            </div>
            <div className="d2-toolbar">
              <label className="d2-search">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.2-3.2" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari toko / nomor..."
                  aria-label="Cari transaksi"
                />
              </label>
              <select
                className="d2-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Urutkan transaksi"
              >
                <option value="newest">Terbaru</option>
                <option value="total">Total terbesar</option>
                <option value="laba">Laba terbesar</option>
              </select>
              <Link href="/sales" className="d2-link">
                Lihat semua →
              </Link>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="tw mt-1">
              <table className="t">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Toko</th>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th className="r">Total</th>
                    <th className="r">Laba</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr
                      key={s.id}
                      className="cl"
                      onClick={() => setDetailId(s.id)}
                    >
                      <td data-label="No." className="font-semibold">
                        {s.id}
                      </td>
                      <td data-label="Toko">{s.customer}</td>
                      <td data-label="Tanggal" style={{ color: "#71717a" }}>
                        {formatDate(s.date)}
                      </td>
                      <td data-label="Jenis">
                        <Badge tone={s.type === "tempo" ? "b-in" : "b-ac"}>
                          {s.type === "tempo" ? "Tempo" : "Tunai"}
                        </Badge>
                      </td>
                      <td data-label="Total" className="r num">
                        {rp(saleTotal(s))}
                      </td>
                      <td
                        data-label="Laba"
                        className="r num"
                        style={{ color: "var(--ok)" }}
                      >
                        {rp(saleProfit(s))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="px-5 py-10 text-center text-sm"
              style={{ color: "#71717a" }}
            >
              Tidak ada transaksi yang cocok.
            </div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <motion.div
            className="d2-card p-4 lg:col-span-2"
            {...fadeUp(0.42)}
          >
            <div className="flex justify-between items-center">
              <div className="d2-card-t">Piutang aktif</div>
              <Link href="/ar" className="d2-link">
                Kelola →
              </Link>
            </div>
            <div className="text-[26px] font-extrabold num tracking-tight mt-1">
              {rp(ar)}
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--mu)" }}>
              {open.length} tagihan belum lunas
            </div>

            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2">
              {arGroups.map((g) => (
                <div
                  key={g[0]}
                  style={{
                    width: `${(g[1] / (ar || 1)) * 100}%`,
                    background: g[2],
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px] mb-4">
              {arGroups.map((g) => (
                <div key={g[0]}>
                  <div
                    className="flex items-center gap-1"
                    style={{ color: "var(--mu)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: g[2] }}
                    />
                    {g[0]}
                  </div>
                  <div className="font-semibold num">{rp(g[1])}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {due.slice(0, 4).map((s) => (
                <Link
                  key={s.id}
                  href="/ar"
                  className="ari flex justify-between items-center p-3 rounded-xl"
                >
                  <div>
                    <div className="font-semibold text-[13px]">
                      {s.customer}
                    </div>
                    <div className="text-xs" style={{ color: "var(--mu)" }}>
                      Jatuh tempo {formatDate(s.due)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num font-semibold text-[13px]">
                      {rp(saleTotal(s) - salePaid(s))}
                    </div>
                    <Badge tone={arStatus(s)}>{arStatus(s)}</Badge>
                  </div>
                </Link>
              ))}
              {due.length === 0 && (
                <div className="text-sm" style={{ color: "var(--mu)" }}>
                  Tidak ada tagihan jatuh tempo.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div className="d2-card p-4" {...fadeUp(0.46)}>
            <div className="d2-card-t mb-3">Stok perlu restock</div>
            {low.map((v) => (
              <div
                key={v.id}
                className="flex justify-between py-2 border-b text-[13px]"
                style={{ borderColor: "#EEF1F6" }}
              >
                <span>
                  {v.pname}{" "}
                  <span style={{ color: "var(--mu)" }}>· {v.name}</span>
                </span>
                <span
                  className={`bd ${v.stock < 0 ? "b-er" : v.stock < 10 ? "b-er" : "b-wa"}`}
                >
                  {v.stock}
                </span>
              </div>
            ))}
            {low.length === 0 && (
              <div className="text-sm" style={{ color: "var(--mu)" }}>
                Semua stok aman.
              </div>
            )}
            {pending > 0 && (
              <Link
                href="/approvals"
                className="block mt-4 p-3 rounded-lg text-[13px] font-semibold"
                style={{ background: "var(--wab)", color: "var(--wa)" }}
              >
                {pending} perubahan menunggu persetujuan →
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      <SaleFormDrawer
        key={`sale-form-${saleOpen ? "open" : "closed"}`}
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
      />
      <PurchaseFormDrawer
        key={`purchase-form-${purchaseOpen ? "open" : "closed"}`}
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
      />
      <SaleDetailDrawer
        key={`sale-detail-${detailId ?? "none"}`}
        saleId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
