"use client";

import { useMemo, useState } from "react";
import { formatDate, formatMonth, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import {
  allV,
  arStatus,
  saleCost,
  saleOps,
  salePaid,
  saleProfit,
  saleSub,
  saleTotal,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import { ColumnBars, HBarList } from "@/components/charts/Charts";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Kpi } from "@/components/ui/Kpi";
import { PageHead } from "@/components/ui/PageHead";
import type { Sale } from "@/lib/types";

const TABS = [
  ["sales", "Penjualan"],
  ["profit", "Laba per order"],
  ["exp", "Pengeluaran"],
  ["purch", "Pembelian supplier"],
  ["stock", "Stok"],
  ["ar", "Piutang"],
] as const;

type Tab = (typeof TABS)[number][0];

export function ReportsView() {
  const { db } = useStore();
  const [tab, setTab] = useState<Tab>("sales");

  const months = useMemo(
    () =>
      [...new Set(db.sales.map((s) => s.date.slice(0, 7)))].sort().reverse(),
    [db.sales],
  );
  const [month, setMonth] = useState(TODAY.slice(0, 7));

  const ms = useMemo(
    () => db.sales.filter((s) => s.date.slice(0, 7) === month),
    [db.sales, month],
  );

  const T = (rows: Sale[]) => rows.reduce((x, s) => x + saleTotal(s), 0);
  const P = (rows: Sale[]) => rows.reduce((x, s) => x + saleProfit(s), 0);

  return (
    <>
      <PageHead
        title="Laporan"
        subtitle="Ringkasan bisnis otomatis dari transaksi, pembelian, dan stok."
        actions={
          <>
            <select
              className="w-48"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Pilih periode"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
            >
              Cetak
            </button>
          </>
        }
      />

      <div className="seg mb-5">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "on" : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rp">
        {tab === "sales" && <SalesTab ms={ms} T={T} P={P} />}
        {tab === "profit" && <ProfitTab ms={ms} T={T} P={P} />}
        {tab === "exp" && <ExpenseTab ms={ms} P={P} month={month} />}
        {tab === "purch" && <PurchaseTab month={month} />}
        {tab === "stock" && <StockTab />}
        {tab === "ar" && <ArTab />}
      </div>
    </>
  );
}

function Sec({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <div className="font-bold" style={{ color: "var(--nv)" }}>
          {title}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: "var(--mu)" }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function TblCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden mt-4">
      <div className="px-5 pt-5 pb-3 flex justify-between items-center">
        <div className="font-bold" style={{ color: "var(--nv)" }}>
          {title}
        </div>
        <span className="text-xs" style={{ color: "var(--mu)" }}>
          Detail
        </span>
      </div>
      {children}
    </div>
  );
}

function SalesTab({
  ms,
  T,
  P,
}: {
  ms: Sale[];
  T: (rows: Sale[]) => number;
  P: (rows: Sale[]) => number;
}) {
  const days = useMemo(
    () => [...new Set(ms.map((s) => s.date))].sort().reverse(),
    [ms],
  );
  const asc = days.slice().reverse();

  const columns: Column<{ date: string; rows: Sale[] }>[] = [
    { key: "date", label: "Tanggal", render: (r) => formatDate(r.date) },
    {
      key: "count",
      label: "Transaksi",
      align: "right",
      render: (r) => r.rows.length,
    },
    {
      key: "omzet",
      label: "Omzet",
      align: "right",
      render: (r) => <span className="num">{rp(T(r.rows))}</span>,
    },
    {
      key: "modal",
      label: "Modal",
      align: "right",
      render: (r) => (
        <span className="num">{rp(r.rows.reduce((x, s) => x + saleCost(s), 0))}</span>
      ),
    },
    {
      key: "ops",
      label: "Biaya ops",
      align: "right",
      render: (r) => (
        <span className="num">{rp(r.rows.reduce((x, s) => x + saleOps(s), 0))}</span>
      ),
    },
    {
      key: "profit",
      label: "Laba",
      align: "right",
      render: (r) => (
        <span className="num font-semibold">{rp(P(r.rows))}</span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Omzet bulan"
          value={rp(T(ms))}
          sub={`${ms.length} transaksi`}
          icon="wallet"
          color="#9A6F00"
          bg="#FFF4CC"
        />
        <Kpi
          label="Laba bersih order"
          value={rp(P(ms))}
          sub={`Margin ${Math.round((P(ms) / (T(ms) || 1)) * 100)}%`}
          icon="trend"
          color="#15803D"
          bg="#E7F6EC"
        />
        <Kpi
          label="Rata-rata/transaksi"
          value={rp(T(ms) / (ms.length || 1))}
          sub="Nilai order"
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Hari aktif"
          value={`${days.length} hari`}
          sub={`Rata-rata ${rp(T(ms) / (days.length || 1))}/hari`}
          icon="box"
          color="#04123F"
          bg="#E6EAF4"
        />
      </div>

      <Sec
        title="Omzet & laba harian"
        sub="Bagian gold menunjukkan porsi laba dari omzet"
      >
        <ColumnBars
          labels={asc.map((d) => d.slice(8))}
          omzet={asc.map((d) => T(ms.filter((s) => s.date === d)))}
          laba={asc.map((d) => P(ms.filter((s) => s.date === d)))}
        />
      </Sec>

      <TblCard title="Rincian">
        <DataTable
          columns={columns}
          rows={days.map((d) => ({ date: d, rows: ms.filter((s) => s.date === d) }))}
          rowKey={(r) => r.date}
        />
      </TblCard>
    </>
  );
}

function ProfitTab({
  ms,
  T,
  P,
}: {
  ms: Sale[];
  T: (rows: Sale[]) => number;
  P: (rows: Sale[]) => number;
}) {
  const best = ms.slice().sort((a, b) => saleProfit(b) - saleProfit(a))[0];
  const low = ms.filter((s) => saleProfit(s) <= 0).length;

  const columns: Column<Sale>[] = [
    {
      key: "id",
      label: "Invoice",
      render: (s) => <span className="font-semibold">{s.id}</span>,
    },
    { key: "customer", label: "Pelanggan", render: (s) => s.customer },
    {
      key: "sub",
      label: "Penjualan",
      align: "right",
      render: (s) => <span className="num">{rp(saleSub(s))}</span>,
    },
    {
      key: "cost",
      label: "Modal",
      align: "right",
      render: (s) => <span className="num">{rp(saleCost(s))}</span>,
    },
    {
      key: "ship",
      label: "Ongkir",
      align: "right",
      render: (s) => <span className="num">{rp(s.ship)}</span>,
    },
    {
      key: "pack",
      label: "Packing",
      align: "right",
      render: (s) => <span className="num">{rp(s.pack)}</span>,
    },
    {
      key: "other",
      label: "Lain",
      align: "right",
      render: (s) => <span className="num">{rp(s.other)}</span>,
    },
    {
      key: "profit",
      label: "Laba",
      align: "right",
      render: (s) => (
        <span className="num font-semibold" style={{ color: "var(--ok)" }}>
          {rp(saleProfit(s))}
        </span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      align: "right",
      render: (s) => `${Math.round((saleProfit(s) / saleSub(s)) * 100)}%`,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Total laba order"
          value={rp(P(ms))}
          sub={`${ms.length} order`}
          icon="trend"
          color="#15803D"
          bg="#E7F6EC"
        />
        <Kpi
          label="Margin rata-rata"
          value={`${Math.round((P(ms) / (T(ms) || 1)) * 100)}%`}
          sub="Laba ÷ penjualan"
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Order terbaik"
          value={best ? rp(saleProfit(best)) : "-"}
          sub={best ? `${best.id} · ${best.customer}` : ""}
          icon="wallet"
          color="#9A6F00"
          bg="#FFF4CC"
        />
        <Kpi
          label="Order laba ≤ 0"
          value={`${low} order`}
          sub="Perlu cek harga / ongkir"
          icon="box"
          color="#DC2626"
          bg="#FDECEC"
        />
      </div>

      <TblCard title="Rincian">
        <DataTable
          columns={columns}
          rows={ms.slice().reverse()}
          rowKey={(s) => s.id}
        />
      </TblCard>
    </>
  );
}

function ExpenseTab({
  ms,
  P,
  month,
}: {
  ms: Sale[];
  P: (rows: Sale[]) => number;
  month: string;
}) {
  const { db } = useStore();
  const ops = ms.reduce((x, s) => x + saleOps(s), 0);
  const ex = db.expenses.filter((e) => e.date.slice(0, 7) === month);
  const ship = ms.reduce((x, s) => x + +s.ship, 0);
  const pack = ms.reduce((x, s) => x + +s.pack, 0);

  const rows: [string, number][] = [
    ["Ongkir (dari order)", ship],
    ["Packing (dari order)", pack],
    ["Biaya lain order", ops - ship - pack],
    ...ex.map((e) => [e.cat, e.amt] as [string, number]),
  ];
  const total = rows.reduce((a, r) => a + r[1], 0);
  const general = ex.reduce((a, e) => a + e.amt, 0);

  const columns: Column<[string, number]>[] = [
    { key: "cat", label: "Kategori pengeluaran", render: (r) => r[0] },
    {
      key: "amt",
      label: "Jumlah",
      align: "right",
      render: (r) => <span className="num">{rp(r[1])}</span>,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Kpi
          label="Total pengeluaran"
          value={rp(total)}
          sub={`${rows.length} kategori`}
          icon="wallet"
          color="#DC2626"
          bg="#FDECEC"
        />
        <Kpi
          label="Laba order"
          value={rp(P(ms))}
          sub="Sebelum biaya umum"
          icon="trend"
          color="#15803D"
          bg="#E7F6EC"
        />
        <Kpi
          label="Estimasi laba bersih"
          value={rp(P(ms) - general)}
          sub="Laba order − biaya umum"
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
      </div>

      <Sec title="Komposisi pengeluaran" sub="Diurutkan dari yang terbesar">
        <HBarList rows={rows.slice().sort((a, b) => b[1] - a[1])} />
      </Sec>

      <TblCard title="Rincian">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r[0]}
        />
        <div
          className="card p-4 mt-4 text-[13px] flex flex-wrap justify-between gap-2"
          style={{ background: "#04123F", color: "#fff", border: 0 }}
        >
          <span>
            Laba order {rp(P(ms))} − biaya umum {rp(general)}
          </span>
          <b className="num" style={{ color: "#FEC40B" }}>
            = {rp(P(ms) - general)}
          </b>
        </div>
      </TblCard>
    </>
  );
}

function PurchaseTab({ month }: { month: string }) {
  const { db } = useStore();
  const ps = db.purchases.filter((p) => p.date.slice(0, 7) === month);
  const sups = [...new Set(ps.map((p) => p.supplier))];
  const ptot = (p: (typeof ps)[number]) =>
    p.items.reduce((y, i) => y + i.qty * i.cost, 0);
  const sr = sups
    .map((s) => [s, ps.filter((p) => p.supplier === s).reduce((x, p) => x + ptot(p), 0)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const columns: Column<string>[] = [
    {
      key: "sup",
      label: "Supplier",
      render: (s) => <span className="font-semibold">{s}</span>,
    },
    {
      key: "nota",
      label: "Jumlah nota",
      align: "right",
      render: (s) => ps.filter((p) => p.supplier === s).length,
    },
    {
      key: "unit",
      label: "Total unit",
      align: "right",
      render: (s) =>
        ps
          .filter((p) => p.supplier === s)
          .reduce((x, p) => x + p.items.reduce((y, i) => y + i.qty, 0), 0),
    },
    {
      key: "total",
      label: "Total pembelian",
      align: "right",
      render: (s) => (
        <span className="num">
          {rp(ps.filter((p) => p.supplier === s).reduce((x, p) => x + ptot(p), 0))}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Kpi
          label="Total pembelian"
          value={rp(sr.reduce((a, r) => a + r[1], 0))}
          sub={`${ps.length} nota`}
          icon="wallet"
          color="#9A6F00"
          bg="#FFF4CC"
        />
        <Kpi
          label="Supplier aktif"
          value={`${sups.length} supplier`}
          sub="Periode ini"
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Unit dibeli"
          value={`${ps.reduce((x, p) => x + p.items.reduce((y, i) => y + i.qty, 0), 0)} unit`}
          sub="Masuk ke stok"
          icon="box"
          color="#04123F"
          bg="#E6EAF4"
        />
      </div>

      {sr.length > 0 && (
        <Sec title="Pembelian per supplier" sub="Supplier terbesar ditandai gold">
          <HBarList rows={sr} />
        </Sec>
      )}

      <TblCard title="Rincian">
        <DataTable
          columns={columns}
          rows={sups}
          rowKey={(s) => s}
          emptyText="Tidak ada pembelian pada periode ini"
        />
      </TblCard>
    </>
  );
}

function StockTab() {
  const { db } = useStore();
  const av = allV(db);
  const mc = av.reduce((a, v) => a + v.stock * v.cost, 0);
  const mj = av.reduce((a, v) => a + v.stock * v.price, 0);

  const columns: Column<(typeof av)[number]>[] = [
    {
      key: "name",
      label: "Barang",
      render: (v) => `${v.pname} · ${v.name}`,
    },
    { key: "stock", label: "Stok", align: "right", render: (v) => v.stock },
    {
      key: "cost",
      label: "Nilai modal",
      align: "right",
      render: (v) => <span className="num">{rp(v.stock * v.cost)}</span>,
    },
    {
      key: "price",
      label: "Nilai jual",
      align: "right",
      render: (v) => <span className="num">{rp(v.stock * v.price)}</span>,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Total unit"
          value={`${av.reduce((a, v) => a + v.stock, 0)} unit`}
          sub={`${av.length} varian`}
          icon="box"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Nilai modal"
          value={rp(mc)}
          sub="Harga supplier"
          icon="wallet"
          color="#9A6F00"
          bg="#FFF4CC"
        />
        <Kpi
          label="Nilai jual"
          value={rp(mj)}
          sub="Harga customer"
          icon="spark"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Potensi laba"
          value={rp(mj - mc)}
          sub={`${av.filter((v) => v.stock < 15).length} varian menipis`}
          icon="trend"
          color="#15803D"
          bg="#E7F6EC"
        />
      </div>

      <TblCard title="Rincian">
        <DataTable columns={columns} rows={av} rowKey={(v) => v.id} />
      </TblCard>
    </>
  );
}

function ArTab() {
  const { db } = useStore();
  const open = db.sales.filter((s) => arStatus(s) !== "Lunas");
  const rem = (rows: Sale[]) =>
    rows.reduce((x, s) => x + saleTotal(s) - salePaid(s), 0);
  const customers = [...new Set(open.map((s) => s.customer))];
  const cr = customers
    .map((c) => [c, rem(open.filter((s) => s.customer === c))] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const columns: Column<string>[] = [
    {
      key: "cust",
      label: "Pelanggan",
      render: (c) => <span className="font-semibold">{c}</span>,
    },
    {
      key: "count",
      label: "Tagihan terbuka",
      align: "right",
      render: (c) => open.filter((s) => s.customer === c).length,
    },
    {
      key: "rest",
      label: "Sisa piutang",
      align: "right",
      render: (c) => (
        <span className="num">{rp(rem(open.filter((s) => s.customer === c)))}</span>
      ),
    },
    {
      key: "late",
      label: "Terlambat",
      align: "right",
      render: (c) => (
        <span className="num" style={{ color: "var(--er)" }}>
          {rp(
            rem(
              open.filter(
                (s) => s.customer === c && arStatus(s) === "Terlambat",
              ),
            ),
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Total piutang"
          value={rp(rem(open))}
          sub={`${open.length} tagihan`}
          icon="wallet"
          color="#04123F"
          bg="#E6EAF4"
        />
        <Kpi
          label="Terlambat"
          value={rp(rem(open.filter((s) => arStatus(s) === "Terlambat")))}
          sub={`${open.filter((s) => arStatus(s) === "Terlambat").length} tagihan`}
          icon="box"
          color="#DC2626"
          bg="#FDECEC"
        />
        <Kpi
          label="Jatuh tempo ≤3 hari"
          value={rp(rem(open.filter((s) => arStatus(s) === "Jatuh tempo")))}
          sub="Segera ditagih"
          icon="spark"
          color="#B45309"
          bg="#FEF3DC"
        />
        <Kpi
          label="Pelanggan berutang"
          value={`${customers.length} pelanggan`}
          sub="Tagihan aktif"
          icon="trend"
          color="#9A6F00"
          bg="#FFF4CC"
        />
      </div>

      <Sec
        title="Piutang per pelanggan"
        sub="Pelanggan dengan sisa terbesar ditandai gold"
      >
        <HBarList rows={cr} />
      </Sec>

      <TblCard title="Rincian">
        <DataTable
          columns={columns}
          rows={customers}
          rowKey={(c) => c}
          emptyText="Tidak ada piutang aktif"
        />
      </TblCard>
    </>
  );
}
