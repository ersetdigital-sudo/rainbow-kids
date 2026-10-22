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

/** Inisial nama produk untuk avatar kartu varian. */
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const stockTone = (stock: number) =>
  stock < 0 ? "b-er" : stock < 15 ? "b-wa" : "b-ok";

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

  const variants = useMemo(() => allV(db), [db]);

  const list = useMemo(() => {
    const filtered = variants.filter(
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
  }, [variants, cat, query]);

  const minus = list.filter((v) => v.stock < 0);
  const restock = list.filter((v) => v.stock >= 0 && v.stock < 15);

  const stockValue = variants.reduce(
    (x, v) => x + Math.max(v.stock, 0) * v.cost,
    0,
  );
  const stockUnits = variants.reduce((x, v) => x + Math.max(v.stock, 0), 0);
  const minusAll = variants.filter((v) => v.stock < 0).length;
  const lowAll = variants.filter((v) => v.stock >= 0 && v.stock < 15).length;

  const countIn = (c: string) =>
    c ? variants.filter((v) => v.cat === c).length : variants.length;

  const columns: Column<FlatVariant>[] = [
    {
      key: "pname",
      label: "Produk",
      render: (v) => (
        <div className="st-prod">
          <span className="st-av" aria-hidden="true">
            {initials(v.pname)}
          </span>
          <span className="st-prod-txt">
            <span className="st-prod-name">
              {v.pname}
              {v.stock < 0 && <span className="st-flag">Restock</span>}
            </span>
            <span className="st-prod-sub">
              {v.name} · {v.cat}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "stock",
      label: "Stok",
      align: "right",
      render: (v) => (
        <span className={`bd num ${stockTone(v.stock)}`}>{v.stock}</span>
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
        <span className="st-range">
          <span className="num">{rp(v.minPrice)}</span>
          <span className="st-range-sep">–</span>
          <span className="num">{rp(v.maxPrice)}</span>
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

      {/* Ringkasan persediaan */}
      <section className="st-hero">
        <div className="st-hero-body">
          <div>
            <div className="st-kicker">Nilai stok tersedia</div>
            <div className="st-value num">{rp(stockValue)}</div>
            <div className="st-chips">
              <span className="st-chip">
                {variants.length} varian · {db.products.length} produk
              </span>
              <span className="st-chip num">{stockUnits} unit siap jual</span>
            </div>
          </div>

          <div className="st-tiles">
            <div className="st-tile">
              <div className="l">Varian</div>
              <div className="v num">{variants.length}</div>
            </div>
            <div className="st-tile">
              <div className="l">Kategori</div>
              <div className="v num">{cats.length}</div>
            </div>
            <div className={`st-tile${minusAll ? " bad" : ""}`}>
              <div className="l">Stok minus</div>
              <div className="v num">{minusAll}</div>
            </div>
            <div className={`st-tile${lowAll ? " warn" : ""}`}>
              <div className="l">Menipis (&lt;15)</div>
              <div className="v num">{lowAll}</div>
            </div>
          </div>
        </div>
      </section>

      {(minus.length > 0 || restock.length > 0) && (
        <div className={`st-alert${minus.length ? " bad" : ""}`}>
          <span className="st-alert-ic" aria-hidden="true">
            !
          </span>
          <div>
            <div className="st-alert-t">Peringatan stok — perlu restock</div>
            <div className="st-alert-b">
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
        </div>
      )}

      <div className="card mt-4 st-list">
        <div className="st-listhead">
          <div>
            <div className="st-list-title">Daftar varian</div>
            <div className="st-list-sub">
              {list.length} dari {variants.length} varian
            </div>
          </div>
          <div className="st-search">
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
              placeholder="Cari produk / varian"
              aria-label="Cari produk atau varian"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="st-pills">
          {["", ...cats].map((c) => (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={cat === c}
              className={cat === c ? "on" : undefined}
              onClick={() => setCat(c)}
            >
              {c || "Semua"}
              <b className="num">{countIn(c)}</b>
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          rows={list}
          rowKey={(v) => v.id}
          emptyText="Tidak ada varian yang cocok"
        />
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
