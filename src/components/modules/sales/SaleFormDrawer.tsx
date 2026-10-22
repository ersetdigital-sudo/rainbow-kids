"use client";

import { useMemo, useState } from "react";
import { addDays, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import { salePriceHistory } from "@/lib/calc";
import { useStore, type SaleDraft } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import { Picker } from "@/components/ui/Picker";
import type { CustomerType } from "@/lib/types";

export function SaleFormDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, saveSale, addCustomer, toast } = useStore();

  const variants = useMemo(
    () =>
      db.products.flatMap((p) =>
        p.variants.map((v) => ({
          ...v,
          pname: p.name,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
        })),
      ),
    [db.products],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newType, setNewType] = useState<CustomerType>("Toko");

  // State di-reset lewat remount (parent memberi key berbeda tiap dibuka).
  const [draft, setDraft] = useState<SaleDraft>(() => ({
    customer: "",
    customerId: undefined,
    date: TODAY,
    type: "tunai",
    due: addDays(TODAY, 14),
    items: variants[0]
      ? [{ vid: variants[0].id, qty: 1, price: variants[0].price }]
      : [],
    ship: 0,
    pack: 0,
    other: 0,
    paid: 0,
  }));

  const priced = draft.items.map((i) => {
    const v = variants.find((x) => x.id === i.vid);
    return { ...i, cost: v?.cost ?? 0, stock: v?.stock ?? 0, v };
  });
  const total = priced.reduce((a, i) => a + i.qty * i.price, 0);
  const modal = priced.reduce((a, i) => a + i.qty * i.cost, 0);
  const ops = draft.ship + draft.pack + draft.other;
  const profit = total - modal - ops;

  /** Peringatan stok minus: penjualan tetap dicatat, stok menjadi minus. */
  const stockWarnings = priced
    .filter((i) => i.stock - i.qty < 0)
    .map((i) => ({
      label: `${i.v?.pname ?? "Produk"} · ${i.v?.name ?? ""}`,
      from: i.stock,
      to: i.stock - i.qty,
    }));

  const setItem = (index: number, patch: Partial<SaleDraft["items"][number]>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  const submit = () => {
    const res = saveSale(draft);
    if (!res.ok) {
      toast(res.msg);
      return;
    }
    toast(res.msg);
    (res.warnings ?? []).forEach((w) => toast(`⚠ ${w}`));
    onClose();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Transaksi penjualan baru"
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn p" onClick={submit}>
              Simpan transaksi
            </button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="f">Pelanggan</label>
            <button
              type="button"
              className="btn w-full justify-between"
              style={{ height: 38 }}
              onClick={() => setPickerOpen(true)}
            >
              <span
                className={draft.customer ? "" : "text-left"}
                style={draft.customer ? undefined : { color: "var(--mu)" }}
              >
                {draft.customer || "Pilih pelanggan..."}
              </span>
              <span aria-hidden="true">▾</span>
            </button>
          </div>
          <div>
            <label className="f">Tanggal</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </div>
          <div>
            <label className="f">Jenis pembayaran</label>
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as "tunai" | "tempo" })
              }
            >
              <option value="tunai">Tunai (langsung lunas)</option>
              <option value="tempo">Tempo (piutang)</option>
            </select>
          </div>
          {draft.type === "tempo" ? (
            <div>
              <label className="f">Jatuh tempo</label>
              <input
                type="date"
                value={draft.due}
                onChange={(e) => setDraft({ ...draft, due: e.target.value })}
              />
            </div>
          ) : (
            <div />
          )}
        </div>

        <div className="dsec">Detail produk</div>
        <div className="space-y-2">
          {draft.items.map((it, i) => {
            const info = priced[i];
            const hist = salePriceHistory(db, it.vid);
            return (
              <div key={i}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6">
                    <label className="f">Produk / varian</label>
                    <select
                      value={it.vid}
                      onChange={(e) => {
                        const v = variants.find((x) => x.id === e.target.value);
                        setItem(i, { vid: e.target.value, price: v?.price ?? 0 });
                      }}
                    >
                      {db.products.map((p) => (
                        <optgroup key={p.id} label={`${p.cat} — ${p.name}`}>
                          {p.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {p.name} · {v.name} (stok {v.stock})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="f">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => setItem(i, { qty: +e.target.value })}
                    />
                  </div>
                  <div className="col-span-7 sm:col-span-3">
                    <label className="f">Harga jual</label>
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => setItem(i, { price: +e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <button
                      type="button"
                      className="btn s d w-full justify-center"
                      disabled={draft.items.length < 2}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.filter((_, idx) => idx !== i),
                        }))
                      }
                      aria-label="Hapus baris"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {info.v && (
                  <div
                    className="text-[11.5px] mt-1"
                    style={{ color: "var(--mu)" }}
                  >
                    Standar {rp(info.v.price)} · modal {rp(info.v.cost)}{" "}
                    (internal) ·{" "}
                    {hist
                      ? `histori jual ${rp(hist.min)} – ${rp(hist.max)} (${hist.count} transaksi, terakhir ${rp(hist.last)})`
                      : "belum ada histori harga jual"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn s mt-2"
          onClick={() => {
            const v = variants[3] ?? variants[0];
            if (!v) return;
            setDraft((d) => ({
              ...d,
              items: [...d.items, { vid: v.id, qty: 1, price: v.price }],
            }));
          }}
        >
          + Tambah barang
        </button>

        {stockWarnings.length > 0 && (
          <div
            className="mt-3 p-3 rounded-xl text-[12.5px]"
            style={{ background: "var(--erb)", color: "var(--er)" }}
          >
            <b>Stok tidak mencukupi.</b> Transaksi tetap dicatat, sisanya menjadi
            stok minus dan masuk daftar peringatan restock.
            <ul className="mt-1 space-y-0.5">
              {stockWarnings.map((w) => (
                <li key={w.label}>
                  • {w.label}: stok {w.from} → {w.to}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dsec">Biaya operasional order</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="f">Ongkir</label>
            <input
              type="number"
              value={draft.ship}
              onChange={(e) => setDraft({ ...draft, ship: +e.target.value })}
            />
          </div>
          <div>
            <label className="f">Packing</label>
            <input
              type="number"
              value={draft.pack}
              onChange={(e) => setDraft({ ...draft, pack: +e.target.value })}
            />
          </div>
          <div>
            <label className="f">Biaya lain</label>
            <input
              type="number"
              value={draft.other}
              onChange={(e) => setDraft({ ...draft, other: +e.target.value })}
            />
          </div>
        </div>

        {draft.type === "tempo" && (
          <div className="mt-3">
            <label className="f">Uang muka / bayar sebagian (opsional)</label>
            <input
              type="number"
              value={draft.paid}
              onChange={(e) => setDraft({ ...draft, paid: +e.target.value })}
            />
          </div>
        )}

        <div className="calcbox">
          <div className="flex justify-between py-1 font-semibold">
            <span>Total penjualan</span>
            <span className="num">{rp(total)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px] muted">
            <span>− Modal barang</span>
            <span className="num">{rp(modal)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px] muted">
            <span>− Biaya operasional</span>
            <span className="num">{rp(ops)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold text-base">
            <span>Laba order</span>
            <span className="num gold">{rp(profit)}</span>
          </div>
        </div>
      </Drawer>

      <Picker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pelanggan"
        value={draft.customerId}
        options={db.customers.map((c) => ({
          id: c.id,
          name: c.name,
          sub: c.phone,
          badge: c.type,
        }))}
        onSelect={(o) =>
          setDraft((d) => ({ ...d, customer: o.name, customerId: o.id }))
        }
        onCreate={(name) => {
          const res = addCustomer({ name, type: newType });
          if (res.ok && res.customer) {
            setDraft((d) => ({
              ...d,
              customer: res.customer!.name,
              customerId: res.customer!.id,
            }));
          }
          return res;
        }}
        createLabel="Tambah pelanggan baru"
        createExtra={
          <select
            className="mb-2"
            value={newType}
            onChange={(e) => setNewType(e.target.value as CustomerType)}
          >
            <option value="Toko">Toko</option>
            <option value="Reseller">Reseller</option>
            <option value="Ritel">Ritel</option>
          </select>
        }
      />
    </>
  );
}
