"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { purchaseTotal } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { PurchaseDetailDrawer, PurchaseFormDrawer } from "./PurchaseDrawers";
import type { Purchase } from "@/lib/types";

export function PurchasesView() {
  const { db } = useStore();
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const sups = useMemo(
    () => [...new Set(db.purchases.map((p) => p.supplier))],
    [db.purchases],
  );

  const list = useMemo(
    () =>
      db.purchases
        .filter(
          (p) =>
            (!supplier || p.supplier === supplier) &&
            (!from || p.date >= from) &&
            (!to || p.date <= to) &&
            (!status || p.payStatus === status),
        )
        .slice()
        .reverse(),
    [db.purchases, supplier, from, to, status],
  );

  const rekap = useMemo(() => {
    const map = new Map<string, { n: number; t: number }>();
    for (const p of list) {
      const cur = map.get(p.supplier) ?? { n: 0, t: 0 };
      cur.n += 1;
      cur.t += purchaseTotal(p);
      map.set(p.supplier, cur);
    }
    return [...map.entries()].map(([s, v]) => ({ s, ...v }));
  }, [list]);

  const columns: Column<Purchase>[] = [
    {
      key: "id",
      label: "No.",
      render: (p) => <span className="font-semibold">{p.id}</span>,
    },
    { key: "nota", label: "No. nota", render: (p) => p.nota },
    { key: "date", label: "Tanggal", render: (p) => formatDate(p.date) },
    { key: "supplier", label: "Supplier", render: (p) => p.supplier },
    {
      key: "items",
      label: "Item",
      align: "right",
      render: (p) => p.items.length,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      render: (p) => <span className="num">{rp(purchaseTotal(p))}</span>,
    },
    {
      key: "pay",
      label: "Pembayaran",
      render: (p) => <Badge tone={p.payStatus}>{p.payStatus}</Badge>,
    },
  ];

  return (
    <>
      <PageHead
        title="Pembelian Supplier"
        subtitle="Catat pembelian sesuai nota/struk. Stok bertambah otomatis dan bisa ditelusuri saat stok opname."
        actions={
          <button type="button" className="btn p" onClick={() => setFormOpen(true)}>
            + Catat pembelian
          </button>
        }
      />

      <div className="card p-4 flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label className="f">Supplier</label>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">Semua supplier</option>
            {sups.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="f">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="f">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="f">Status bayar</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            <option value="Belum Lunas">Belum Lunas</option>
            <option value="Menunggu Lunas">Menunggu Lunas</option>
            <option value="Lunas">Lunas</option>
          </select>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setSupplier("");
            setFrom("");
            setTo("");
            setStatus("");
          }}
        >
          Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="px-5 pt-5 pb-3 font-bold">Daftar pembelian</div>
          <DataTable
            columns={columns}
            rows={list}
            rowKey={(p) => p.id}
            onRowClick={(p) => setDetailId(p.id)}
          />
        </div>
        <div className="card p-5">
          <div className="font-bold mb-3">Rekap per supplier</div>
          {rekap.map((r) => (
            <div
              key={r.s}
              className="flex justify-between py-2.5 border-b text-[13px]"
              style={{ borderColor: "#EEF1F6" }}
            >
              <div>
                <div className="font-semibold">{r.s}</div>
                <div className="text-xs" style={{ color: "var(--mu)" }}>
                  {r.n} nota
                </div>
              </div>
              <div className="num font-semibold">{rp(r.t)}</div>
            </div>
          ))}
          <div className="flex justify-between pt-3 font-bold">
            <span>Total periode</span>
            <span className="num">{rp(rekap.reduce((a, r) => a + r.t, 0))}</span>
          </div>
          <div
            className="mt-4 p-3 rounded-lg text-xs"
            style={{ background: "var(--inb)", color: "var(--in)" }}
          >
            <b>Disiapkan untuk:</b> utang supplier (tempo, jatuh tempo, cicilan).
            Kolom status pembayaran sudah tersedia di setiap nota.
          </div>
        </div>
      </div>

      <PurchaseFormDrawer
        key={`purchase-form-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      <PurchaseDetailDrawer
        purchaseId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
