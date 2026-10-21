"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, formatDate, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import { allV, arStatus, salePaid, saleProfit, saleTotal } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { AreaChart } from "@/components/charts/AreaChart";
import { Badge } from "@/components/ui/Badge";
import { Kpi } from "@/components/ui/Kpi";
import { PageHead } from "@/components/ui/PageHead";
import { SaleDetailDrawer } from "@/components/modules/sales/SaleDetailDrawer";
import { SaleFormDrawer } from "@/components/modules/sales/SaleFormDrawer";
import { PurchaseFormDrawer } from "@/components/modules/purchases/PurchaseDrawers";

export function DashboardView() {
  const { db } = useStore();
  const [saleOpen, setSaleOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const low = variants.filter((v) => v.stock < 15);
  const pending = db.approvals.filter((a) => a.status === "Menunggu").length;

  const yesterday = sum(
    db.sales.filter((s) => s.date === addDays(TODAY, -1)),
    saleTotal,
  );
  const td = sum(today, saleTotal);
  const pm = addDays(TODAY, -30).slice(0, 7);
  const dd = TODAY.slice(8);
  const prev = sum(
    db.sales.filter(
      (s) => s.date.slice(0, 7) === pm && s.date.slice(8) <= dd,
    ),
    saleTotal,
  );
  const mt = sum(month, saleTotal);
  const pf = sum(month, saleProfit);
  const tr = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

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

  return (
    <>
      <PageHead
        title="Selamat pagi, Budi"
        subtitle={`Ringkasan usaha per ${formatDate(TODAY)}`}
        actions={
          <>
            <button
              type="button"
              className="btn p"
              onClick={() => setSaleOpen(true)}
            >
              + Penjualan baru
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setPurchaseOpen(true)}
            >
              + Pembelian
            </button>
          </>
        }
      />

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
                {lowStock.map((v) => `${v.pname} · ${v.name} (${v.stock})`).join(", ")}
              </div>
            )}
          </div>
          <Link
            href="/stock"
            className="btn s mt-3"
            style={{ background: "#fff", borderColor: "rgba(4,18,63,.15)" }}
          >
            Kelola stok & buat pembelian →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          label="Omzet hari ini"
          value={rp(td)}
          sub={`${today.length} transaksi`}
          icon="wallet"
          color="#9A6F00"
          bg="#FFF4CC"
          trend={tr(td, yesterday)}
          highlight="vs kemarin"
        />
        <Kpi
          label="Omzet bulan ini"
          value={rp(mt)}
          sub={`${month.length} transaksi`}
          icon="trend"
          color="#15803D"
          bg="#E7F6EC"
          trend={tr(mt, prev)}
          highlight="vs periode lalu"
        />
        <Kpi
          label="Estimasi laba"
          value={rp(pf)}
          sub={`Margin ${Math.round((pf / (mt || 1)) * 100)}% setelah biaya`}
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Total stok"
          value={`${stock.toLocaleString("id-ID")} unit`}
          sub={`Nilai modal ${rp(stockVal)}`}
          icon="box"
          color="#04123F"
          bg="#E6EAF4"
          highlight={`${low.length} varian menipis`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-bold">Penjualan 14 hari terakhir</div>
              <div className="text-xs" style={{ color: "var(--mu)" }}>
                Total{" "}
                <b className="num" style={{ color: "var(--tx)" }}>
                  {rp(vals.reduce((a, b) => a + b, 0))}
                </b>{" "}
                · rata-rata {rp(vals.reduce((a, b) => a + b, 0) / 14)}/hari
              </div>
            </div>
            <span className="bd b-ac">Harian</span>
          </div>
          <AreaChart days={days} values={vals} />
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center">
            <div className="font-bold">Piutang aktif</div>
            <Link
              href="/ar"
              className="text-xs font-semibold"
              style={{ color: "var(--ac)" }}
            >
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
                style={{ width: `${(g[1] / (ar || 1)) * 100}%`, background: g[2] }}
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
                  <div className="font-semibold text-[13px]">{s.customer}</div>
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
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center px-5 pt-5 pb-3">
            <div className="font-bold">Transaksi terbaru</div>
            <Link
              href="/sales"
              className="text-sm font-semibold"
              style={{ color: "var(--ac)" }}
            >
              Lihat semua
            </Link>
          </div>
          <div className="tw">
            <table className="t">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Pelanggan</th>
                  <th>Jenis</th>
                  <th className="r">Total</th>
                  <th className="r">Laba</th>
                </tr>
              </thead>
              <tbody>
                {db.sales
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="cl"
                      onClick={() => setDetailId(s.id)}
                    >
                      <td data-label="No." className="font-semibold">
                        {s.id}
                      </td>
                      <td data-label="Pelanggan">{s.customer}</td>
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
        </div>

        <div className="card p-5">
          <div className="font-bold mb-3">Stok perlu restock</div>
          {low.map((v) => (
            <div
              key={v.id}
              className="flex justify-between py-2 border-b text-[13px]"
              style={{ borderColor: "#EEF1F6" }}
            >
              <span>
                {v.pname}{" "}
                <span style={{ color: "var(--mu)" }}>
                  · {v.name}
                </span>
              </span>
              <span className={`bd ${v.stock < 0 ? "b-er" : v.stock < 10 ? "b-er" : "b-wa"}`}>
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
