"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { useStore, type VariantInput } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyInput, NumberInput } from "@/components/ui/NumericInput";
import type { HistoryEntry, Variant } from "@/lib/types";

/* ---------- Riwayat varian ---------- */
export function VariantHistoryDrawer({
  vid,
  onClose,
}: {
  vid: string | null;
  onClose: () => void;
}) {
  const { db } = useStore();
  const entries = db.history.filter((h) => h.vid === vid).slice().reverse();
  const label = (() => {
    for (const p of db.products) {
      const v = p.variants.find((x) => x.id === vid);
      if (v) return `${p.name} · ${v.name}`;
    }
    return vid ?? "";
  })();

  return (
    <Drawer open={Boolean(vid)} onClose={onClose} title={`Riwayat · ${label}`}>
      <div className="tw">
        <table className="t">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th>Oleh</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center nolabel"
                  style={{ color: "var(--mu)" }}
                >
                  Belum ada riwayat
                </td>
              </tr>
            ) : (
              entries.map((h: HistoryEntry, i: number) => (
                <tr key={i}>
                  <td data-label="Tanggal">{formatDate(h.date)}</td>
                  <td data-label="Jenis">
                    <Badge tone={h.type === "Harga" ? "b-ac" : "b-ok"}>
                      {h.type}
                    </Badge>
                  </td>
                  <td data-label="Keterangan">{h.desc}</td>
                  <td data-label="Oleh" style={{ color: "var(--mu)" }}>
                    {h.user}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}

function useMemoVariant(
  products: { name: string; minPrice: number; maxPrice: number; variants: Variant[] }[],
  vid: string | null,
) {
  for (const p of products) {
    const v = p.variants.find((x) => x.id === vid);
    if (v) return { ...v, pname: p.name, minPrice: p.minPrice, maxPrice: p.maxPrice };
  }
  return null;
}

/* ---------- Ajukan perubahan ---------- */
export function ChangeRequestDrawer({
  vid,
  onClose,
}: {
  vid: string | null;
  onClose: () => void;
}) {
  const { db, submitChange, toast } = useStore();
  const variant = useMemoVariant(db.products, vid);

  // Di-reset lewat remount: parent memakai key={vid}.
  const [name, setName] = useState(() => variant?.name ?? "");
  const [cost, setCost] = useState(() => variant?.cost ?? 0);
  const [minPrice, setMinPrice] = useState(() => variant?.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(() => variant?.maxPrice ?? 0);

  if (!variant) return null;

  const submit = () => {
    const res = submitChange(variant.id, { name, cost, minPrice, maxPrice });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={Boolean(vid)}
      onClose={onClose}
      title={`Ajukan perubahan · ${variant.pname} · ${variant.name}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            Kirim untuk approval
          </button>
        </>
      }
    >
      <p className="text-sm mb-4" style={{ color: "var(--mu)" }}>
        Perubahan nama varian, harga modal, dan rentang harga jual tidak
        langsung berlaku. Owner perlu menyetujui di menu Approval.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="f">Nama varian</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="f">Harga modal (internal)</label>
          <MoneyInput value={cost} onChange={setCost} />
        </div>
        <div>
          <label className="f">Harga jual minimum</label>
          <MoneyInput value={minPrice} onChange={setMinPrice} />
        </div>
        <div>
          <label className="f">Harga jual maksimum</label>
          <MoneyInput value={maxPrice} onChange={setMaxPrice} />
        </div>
      </div>
      <div className="sim mt-4">
        Rentang harga jual berlaku untuk semua varian {variant.pname}. Harga
        jual aktual tetap ditentukan saat transaksi penjualan.
      </div>
    </Drawer>
  );
}

/* ---------- Produk baru ---------- */
export function ProductFormDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, addProduct, toast } = useStore();
  const [cat, setCat] = useState("");
  const [name, setName] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [rows, setRows] = useState<VariantInput[]>(() => [
    { name: "", stock: 0, cost: 0, price: 0 },
  ]);
  const cats = [...new Set(db.products.map((p) => p.cat))];

  const update = (i: number, patch: Partial<VariantInput>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const submit = () => {
    const res = addProduct({
      cat,
      name,
      minPrice,
      maxPrice,
      variants: rows.filter((r) => r.name.trim()),
    });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Produk baru"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            Simpan produk
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="f">Kategori (bebas)</label>
          <input
            list="rk-cats"
            placeholder="mis. Sepatu"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          />
          <datalist id="rk-cats">
            {cats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="f">Nama produk</label>
          <input
            placeholder="mis. Sepatu Anak LED"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="f">Harga jual minimum</label>
          <MoneyInput value={minPrice} onChange={setMinPrice} />
        </div>
        <div>
          <label className="f">Harga jual maksimum</label>
          <MoneyInput value={maxPrice} onChange={setMaxPrice} />
        </div>
      </div>

      <div className="dsec">Varian</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              placeholder="Nama varian"
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <NumberInput
              placeholder="Stok awal"
              value={r.stock}
              onChange={(stock) => update(i, { stock })}
            />
            <MoneyInput
              placeholder="Harga modal"
              value={r.cost}
              onChange={(cost) => update(i, { cost })}
            />
            <MoneyInput
              placeholder="Harga standar"
              value={r.price}
              onChange={(price) => update(i, { price })}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn s mt-2"
        onClick={() =>
          setRows((r) => [...r, { name: "", stock: 0, cost: 0, price: 0 }])
        }
      >
        + Tambah varian
      </button>
      <div className="sim mt-4">
        Harga standar hanya acuan. Harga jual aktual bebas ditentukan saat
        transaksi dalam rentang {rp(minPrice)} – {rp(maxPrice)}.
      </div>
    </Drawer>
  );
}
