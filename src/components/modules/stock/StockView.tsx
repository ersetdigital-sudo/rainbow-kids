"use client";

import { useMemo, useState } from "react";
import { rp } from "@/lib/format";
import { allV } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import type { FlatVariant } from "@/lib/calc";
import {
  ChangeRequestDrawer,
  ProductFormDrawer,
  VariantHistoryDrawer,
} from "./StockDrawers";

export function StockView() {
  const { db } = useStore();
  const [cat, setCat] = useState("");
  const [query, setQuery] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const cats = useMemo(
    () => [...new Set(db.products.map((p) => p.cat))],
    [db.products],
  );

  const list = useMemo(() => {
    const filtered = allV(db).filter(
      (v) =>
        (!cat || v.cat === cat) &&
        (!query ||
          (v.pname + v.name).toLowerCase().includes(query.toLowerCase())),
    );
    // Stok minus & perlu restock didahulukan.
    return filtered.slice().sort((a, b) => {
      const rank = (v: FlatVariant) =>
        v.stock < 0 ? 0 : v.stock === 0 ? 1 : v.stock < 15 ? 2 : 3;
      const d = rank(a) - rank(b);
      return d !== 0 ? d : a.pname.localeCompare(b.pname);
    });
  }, [db, cat, query]);

  const minus = list.filter((v) => v.stock < 0);
  const restock = list.filter((v) => v.stock >= 0 && v.stock < 15);

  const columns: Column<FlatVariant>[] = [
    {
      key: "pname",
      label: "Produk",
      render: (v) => (
        <span>
          <span className="font-semibold">{v.pname}</span>
          {v.stock < 0 && (
            <span
              className="ml-2 text-[11.5px] font-bold"
              style={{ color: "var(--er)" }}
            >
              PERLU RESTOCK
            </span>
          )}
        </span>
      ),
    },
    { key: "name", label: "Varian", render: (v) => v.name },
    {
      key: "cat",
      label: "Kategori",
      render: (v) => <span style={{ color: "var(--mu)" }}>{v.cat}</span>,
    },
    {
      key: "stock",
      label: "Stok",
      align: "right",
      render: (v) => (
        <span
          className={`bd ${v.stock < 0 ? "b-er" : v.stock < 15 ? "b-wa" : "b-ok"}`}
        >
          {v.stock}
        </span>
      ),
    },
    {
      key: "cost",
      label: "Harga modal",
      align: "right",
      render: (v) => <span className="num">{rp(v.cost)}</span>,
    },
    {
      key: "range",
      label: "Rentang harga jual",
      align: "right",
      render: (v) => (
        <span className="num">
          {rp(v.minPrice)} – {rp(v.maxPrice)}
        </span>
      ),
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (v) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="btn s"
            onClick={() => setHistoryId(v.id)}
          >
            Riwayat
          </button>
          <button
            type="button"
            className="btn s"
            onClick={() => setChangeId(v.id)}
          >
            Ubah
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Produk & Stok"
        subtitle="Kategori, produk, dan varian bebas diatur. Harga modal & rentang harga jual diubah lewat approval."
        actions={
          <button type="button" className="btn p" onClick={() => setFormOpen(true)}>
            + Produk baru
          </button>
        }
      />

      {(minus.length > 0 || restock.length > 0) && (
        <div
          className="card p-4 mb-4"
          style={{
            borderColor: minus.length ? "#f7c9c9" : "#f6e4a6",
            background: minus.length ? "#FDECEC" : "#FFF8DB",
          }}
        >
          <div
            className="font-bold text-[13.5px]"
            style={{ color: minus.length ? "var(--er)" : "var(--wa)" }}
          >
            ⚠ Peringatan stok — perlu restock
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: "var(--tx)" }}>
            {minus.length > 0 && (
              <div>
                <b>{minus.length} varian stok minus</b> (terjual melebihi stok
                sistem):{" "}
                {minus
                  .slice(0, 4)
                  .map((v) => `${v.pname} · ${v.name} (${v.stock})`)
                  .join(", ")}
              </div>
            )}
            {restock.length > 0 && (
              <div>
                <b>{restock.length} varian menipis</b> (di bawah 15):{" "}
                {restock
                  .slice(0, 4)
                  .map((v) => `${v.pname} · ${v.name} (${v.stock})`)
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tabs mb-4">
        {["", ...cats].map((c) => (
          <button
            key={c || "all"}
            type="button"
            className={cat === c ? "on" : undefined}
            onClick={() => setCat(c)}
          >
            {c || "Semua"}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="p-4">
          <input
            className="max-w-xs"
            placeholder="Cari produk / varian"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <DataTable columns={columns} rows={list} rowKey={(v) => v.id} />
      </div>

      <VariantHistoryDrawer vid={historyId} onClose={() => setHistoryId(null)} />
      <ChangeRequestDrawer
        key={`change-request-${changeId ?? "none"}`}
        vid={changeId}
        onClose={() => setChangeId(null)}
      />
      <ProductFormDrawer
        key={`product-form-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
