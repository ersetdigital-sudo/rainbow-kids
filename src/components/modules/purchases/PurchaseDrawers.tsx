"use client";

import { useMemo, useState } from "react";
import { formatDate, TODAY } from "@/lib/date";
import { rp, initials } from "@/lib/format";
import { lastPurchaseOf, purchaseTotal, variantLabel } from "@/lib/calc";
import { useStore, type PurchaseDraft } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Picker } from "@/components/ui/Picker";

/* ---------- Form pembelian ---------- */
export function PurchaseFormDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, savePurchase, addSupplier, toast } = useStore();
  const variants = useMemo(
    () =>
      db.products.flatMap((p) =>
        p.variants.map((v) => ({ ...v, pname: p.name, cost: v.cost })),
      ),
    [db.products],
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // State di-reset lewat remount (parent memberi key berbeda tiap dibuka).
  const [draft, setDraft] = useState<PurchaseDraft>(() => ({
    supplier: "",
    nota: "",
    date: TODAY,
    items: variants[0]
      ? [{ vid: variants[0].id, qty: 10, cost: variants[0].cost }]
      : [],
  }));

  const total = draft.items.reduce((a, i) => a + i.qty * i.cost, 0);
  const diff = draft.items.filter((i) => {
    const v = variants.find((x) => x.id === i.vid);
    return v && v.cost !== i.cost;
  });

  const setItem = (
    index: number,
    patch: Partial<PurchaseDraft["items"][number]>,
  ) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  const submit = () => {
    const res = savePurchase(draft);
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Catat pembelian dari nota"
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn p" onClick={submit}>
              Konfirmasi &amp; masukkan stok
            </button>
          </>
        }
      >
        <div className="sim mb-4">
          Tip: salin isi nota/struk baris per baris. Menyimpan mencatat
          pembelian dan langsung menambah stok barang.
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="f">Supplier</label>
            <button
              type="button"
              className="btn w-full justify-between"
              style={{ height: 38 }}
              onClick={() => setPickerOpen(true)}
            >
              <span
                style={draft.supplier ? undefined : { color: "var(--mu)" }}
              >
                {draft.supplier || "Pilih supplier..."}
              </span>
              <span aria-hidden="true">▾</span>
            </button>
          </div>
          <div>
            <label className="f">No. nota / struk</label>
            <input
              value={draft.nota}
              onChange={(e) => setDraft({ ...draft, nota: e.target.value })}
            />
          </div>
          <div>
            <label className="f">Tanggal nota</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </div>
        </div>

        <div className="dsec">Daftar barang</div>
        <div className="space-y-2">
          {draft.items.map((it, i) => {
            const last = lastPurchaseOf(db, it.vid);
            const delta = last ? it.cost - last.cost : 0;
            const pct = last && last.cost ? (delta / last.cost) * 100 : 0;
            return (
              <div key={i}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6">
                    <label className="f">Barang / varian</label>
                    <select
                      value={it.vid}
                      onChange={(e) => {
                        const v = variants.find((x) => x.id === e.target.value);
                        setItem(i, { vid: e.target.value, cost: v?.cost ?? 0 });
                      }}
                    >
                      {db.products.map((p) => (
                        <optgroup key={p.id} label={`${p.cat} — ${p.name}`}>
                          {p.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {p.name} · {v.name}
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
                      value={it.qty}
                      onChange={(e) => setItem(i, { qty: +e.target.value })}
                    />
                  </div>
                  <div className="col-span-7 sm:col-span-3">
                    <label className="f">Harga satuan</label>
                    <input
                      type="number"
                      value={it.cost}
                      onChange={(e) => setItem(i, { cost: +e.target.value })}
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
                {last && (
                  <div className="text-[11.5px] mt-1" style={{ color: "var(--mu)" }}>
                    Harga beli terakhir {rp(last.cost)} ({formatDate(last.date)}{" "}
                    · {last.nota}){" "}
                    {delta !== 0 && (
                      <span
                        style={{
                          color: delta > 0 ? "var(--er)" : "var(--ok)",
                        }}
                      >
                        · {delta > 0 ? "naik" : "turun"} {rp(Math.abs(delta))} (
                        {Math.abs(pct).toFixed(1)}%)
                      </span>
                    )}
                    {delta === 0 && <span> · sama</span>}
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
              items: [...d.items, { vid: v.id, qty: 10, cost: v.cost }],
            }));
          }}
        >
          + Tambah barang
        </button>

        <div className="calcbox">
          <div className="flex justify-between font-bold text-base">
            <span>Total pembelian</span>
            <span className="num gold">{rp(total)}</span>
          </div>
          {diff.length > 0 && (
            <div className="text-xs mt-2 gold">
              {diff.length} barang punya harga satuan berbeda dari harga modal saat
              ini. Perubahan harga modal akan diajukan ke approval.
            </div>
          )}
          <div className="text-xs mt-2 muted">
            Status pembayaran awal: <b>Belum Lunas</b>. Penandaan lunas
            memerlukan approval Owner.
          </div>
        </div>
      </Drawer>

      <Picker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Supplier"
        value={draft.supplier}
        options={db.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          sub: s.phone,
        }))}
        onSelect={(o) => setDraft((d) => ({ ...d, supplier: o.name }))}
        onCreate={(name) => {
          const res = addSupplier({ name });
          if (res.ok && res.supplier)
            setDraft((d) => ({ ...d, supplier: res.supplier!.name }));
          return res;
        }}
        createLabel="Tambah supplier baru"
        emptyText="Belum ada supplier tersimpan"
      />
    </>
  );
}

/* ---------- Detail pembelian ---------- */
export function PurchaseDetailDrawer({
  purchaseId,
  onClose,
}: {
  purchaseId: string | null;
  onClose: () => void;
}) {
  const { db, requestPurchaseLunas, toast } = useStore();
  const p = db.purchases.find((x) => x.id === purchaseId);
  if (!p) return null;

  const total = purchaseTotal(p);
  const qty = p.items.reduce((a, i) => a + i.qty, 0);

  const requestLunas = () => {
    const res = requestPurchaseLunas(p.id);
    toast(res.msg);
  };

  return (
    <Drawer
      open={Boolean(purchaseId)}
      onClose={onClose}
      title="Detail Pembelian Supplier"
      footer={
        <>
          {p.payStatus === "Belum Lunas" && (
            <button type="button" className="btn p" onClick={requestLunas}>
              Ajukan pelunasan
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        </>
      }
    >
      <div className="sdtop">
        <div>
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            No. Pembelian
          </div>
          <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
            {p.id}
          </div>
        </div>
        <Badge tone={p.payStatus}>{p.payStatus}</Badge>
      </div>

      {p.payStatus === "Menunggu Lunas" && (
        <div className="sim" style={{ background: "var(--wab)", borderColor: "#f6e4a6", color: "var(--wa)" }}>
          Pengajuan pelunasan menunggu approval Owner di menu Approval.
        </div>
      )}

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </span>
          <span>Supplier</span>
        </div>
        <div className="font-bold">{p.supplier}</div>
        <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)" }}>
          Nota supplier {p.nota} · {formatDate(p.date)}
        </div>
      </div>

      <div className="sdc">
        <div className="sdh">
          <span className="sdi">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
            </svg>
          </span>
          <span>Barang Diterima</span>
          <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
            {qty} unit
          </span>
        </div>
        {p.items.map((i) => {
          const name = variantLabel(db, i.vid);
          const v = db.products
            .flatMap((x) => x.variants)
            .find((x) => x.id === i.vid);
          const last = lastPurchaseOf(db, i.vid);
          const delta = last ? i.cost - last.cost : 0;
          return (
            <div className="sdp" key={i.vid}>
              <div className="sdth">{initials(name)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]" style={{ color: "var(--nv)" }}>
                  {name}
                </div>
                <div className="text-[12.5px]" style={{ color: "var(--mu)" }}>
                  {i.qty} × {rp(i.cost)}
                  {v?.price ? ` · jual ${rp(v.price)}` : ""}
                </div>
                {last && (
                  <div className="text-[12.5px] mt-1" style={{ color: "var(--mu)" }}>
                    Harga beli lalu {rp(last.cost)}
                    {delta !== 0 && (
                      <span style={{ color: delta > 0 ? "var(--er)" : "var(--ok)" }}>
                        {" "}
                        ({delta > 0 ? "+" : "−"}
                        {rp(Math.abs(delta))})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold num whitespace-nowrap" style={{ color: "var(--nv)" }}>
                  {rp(i.qty * i.cost)}
                </div>
              </div>
            </div>
          );
        })}
        <div
          className="text-[13px] mt-2 pt-2 border-t"
          style={{ borderColor: "var(--ln)" }}
        >
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Jumlah item</span>
            <span>{p.items.length} barang</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Total unit</span>
            <span className="num">{qty} unit</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Status pembayaran</span>
            <b style={{ color: "var(--nv)" }}>{p.payStatus}</b>
          </div>
        </div>
        <div className="sdtot">
          <span>Total Pembelian</span>
          <span className="num">{rp(total)}</span>
        </div>
      </div>

      <div className="text-[13px] px-1">
        <div className="flex justify-between py-1.5">
          <span style={{ color: "var(--mu)" }}>No. Pembelian</span>
          <b style={{ color: "var(--nv)" }}>{p.id}</b>
        </div>
        <div className="flex justify-between py-1.5">
          <span style={{ color: "var(--mu)" }}>No. Nota supplier</span>
          <b style={{ color: "var(--nv)" }}>{p.nota}</b>
        </div>
        <div className="flex justify-between py-1.5">
          <span style={{ color: "var(--mu)" }}>Tanggal pembelian</span>
          <b style={{ color: "var(--nv)" }}>{formatDate(p.date)}</b>
        </div>
      </div>
    </Drawer>
  );
}
