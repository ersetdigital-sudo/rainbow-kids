"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addDays, TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import {
  customerStatus,
  discountOf,
  overdueSales,
  salePaid,
  salePriceHistory,
  saleTotal,
} from "@/lib/calc";
import { useStore, type SaleDraft } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyInput, NumberInput } from "@/components/ui/NumericInput";
import { OverdueWarningDialog } from "@/components/ui/OverdueWarningDialog";
import { Picker } from "@/components/ui/Picker";

/* ---------------- Potongan UI kecil (khusus form ini) ---------------- */

const ICONS = {
  trash: (
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
  store: (
    <path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M10 20v-5h4v5" />
  ),
} as const;

function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      {ICONS[name]}
    </svg>
  );
}

const TONES = {
  ok: { background: "#e7f6ec", color: "#15803d" },
  er: { background: "#fdecec", color: "#dc2626" },
  wa: { background: "#fef3dc", color: "#b45309" },
  mu: { background: "#eef1f6", color: "#33415c" },
} as const;

/** Pil lembut: selalu berisi teks, jadi status tidak hanya bergantung warna. */
function Pill({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span className="bd" style={TONES[tone]}>
      {children}
    </span>
  );
}

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="grid place-items-center w-6 h-6 rounded-full text-[12px] font-extrabold flex-none"
          style={{ background: "var(--acs)", color: "#7a5800" }}
        >
          {n}
        </span>
        <h3
          className="text-[14px] font-extrabold"
          style={{ color: "var(--nv)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h3>
        {hint && (
          <span
            className="ml-auto text-[11.5px] text-right"
            style={{ color: "var(--mu)" }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

const PANEL: React.CSSProperties = {
  background: "#fafbfd",
  border: "1px solid var(--ln)",
};

const TYPE_OPTIONS: { v: "tunai" | "tempo"; title: string; sub: string }[] = [
  { v: "tunai", title: "COD", sub: "Bayar saat barang diterima" },
  { v: "tempo", title: "Tempo", sub: "Piutang dengan jatuh tempo" },
];

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
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [overdueAck, setOverdueAck] = useState(false);
  /** Pesan error di field jenis transaksi (COD/Tempo wajib dipilih). */
  const [typeError, setTypeError] = useState("");

  // State di-reset lewat remount (parent memberi key berbeda tiap dibuka).
  const [draft, setDraft] = useState<SaleDraft>(() => ({
    customer: "",
    customerId: undefined,
    date: TODAY,
    type: "",
    due: addDays(TODAY, db.prefs.dueDays),
    items: variants[0]
      ? [{ vid: variants[0].id, qty: 1, price: variants[0].price }]
      : [],
    ship: 0,
    pack: 0,
    other: 0,
    discount: 0,
    discountNote: "",
    paid: 0,
  }));

  const priced = draft.items.map((i) => {
    const v = variants.find((x) => x.id === i.vid);
    return { ...i, cost: v?.cost ?? 0, stock: v?.stock ?? 0, v };
  });
  const subtotal = priced.reduce((a, i) => a + i.qty * i.price, 0);
  const discount = discountOf(draft.items, draft.discount);
  // Total akhir = subtotal barang − diskon (nominal diisi manual oleh user).
  const total = subtotal - discount;
  const modal = priced.reduce((a, i) => a + i.qty * i.cost, 0);
  const ops = draft.ship + draft.pack + draft.other;
  const profit = total - modal - ops;
  const margin = total > 0 ? (profit / total) * 100 : 0;
  const totalPcs = draft.items.reduce((a, i) => a + i.qty, 0);

  const selectedCustomer =
    db.customers.find((c) => c.id === draft.customerId) ??
    db.customers.find((c) => c.name === draft.customer) ??
    null;
  const selectedStatus = selectedCustomer
    ? customerStatus(selectedCustomer)
    : null;
  const currentOverdue = selectedCustomer
    ? overdueSales(db, selectedCustomer)
    : draft.customer
      ? overdueSales(db, {
          id: draft.customerId,
          name: draft.customer,
        })
      : [];
  const overdueTotal = currentOverdue.reduce(
    (a, s) => a + Math.max(saleTotal(s) - salePaid(s), 0),
    0,
  );

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
    if (!draft.type) {
      setTypeError("Pilih jenis transaksi dulu — COD atau Tempo.");
      return;
    }
    setTypeError("");
    const res = saveSale(draft);
    if (!res.ok) {
      toast(res.msg);
      return;
    }
    toast(res.msg);
    (res.warnings ?? []).forEach((w) => toast(w));
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
              Ajukan invoice
            </button>
          </>
        }
      >
        {/* ---------- 1. Info transaksi ---------- */}
        <Section n={1} title="Info transaksi">
          <div className="rounded-2xl p-4 space-y-3.5" style={PANEL}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="f">Toko</label>
                <button
                  type="button"
                  className="btn w-full justify-between"
                  style={{ height: 42 }}
                  onClick={() => setPickerOpen(true)}
                >
                  <span
                    className="flex items-center gap-2 min-w-0 text-left"
                    style={draft.customer ? undefined : { color: "var(--mu)" }}
                  >
                    <Icon name="store" />
                    <span className="truncate">
                      {draft.customer || "Pilih toko..."}
                    </span>
                    {selectedStatus === "Menunggu" && (
                      <span className="bd b-wa flex-none">
                        Menunggu approval
                      </span>
                    )}
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
            </div>

            <div>
              <div className="f" id="sale-type-label" style={{ fontWeight: 600 }}>
                Jenis transaksi
              </div>
              <div
                role="radiogroup"
                aria-labelledby="sale-type-label"
                aria-describedby={typeError ? "sale-type-error" : undefined}
                className="grid grid-cols-2 gap-2"
              >
                {TYPE_OPTIONS.map((o) => {
                  const on = draft.type === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setTypeError("");
                        setDraft({ ...draft, type: o.v });
                      }}
                      className="text-left rounded-xl px-3.5 py-2.5 transition"
                      style={{
                        background: on ? "var(--acs)" : "#fff",
                        border: `1.5px solid ${
                          on ? "#c99300" : typeError ? "var(--er)" : "var(--ln)"
                        }`,
                        boxShadow: on
                          ? "0 0 0 3px rgba(254,196,11,0.22)"
                          : undefined,
                      }}
                    >
                      <div
                        className="flex items-center gap-2 text-[13.5px] font-extrabold"
                        style={{ color: on ? "#7a5800" : "var(--tx)" }}
                      >
                        <span
                          aria-hidden="true"
                          className="grid place-items-center w-4 h-4 rounded-full flex-none"
                          style={{
                            border: `1.5px solid ${on ? "#c99300" : "#c5cad6"}`,
                            background: on ? "#c99300" : "#fff",
                          }}
                        >
                          {on && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        {o.title}
                      </div>
                      <div
                        className="text-[11.5px] mt-0.5 pl-6"
                        style={{ color: "var(--mu)" }}
                      >
                        {o.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
              {typeError && (
                <div
                  id="sale-type-error"
                  role="alert"
                  className="text-[11.5px] mt-1.5"
                  style={{ color: "var(--er)" }}
                >
                  {typeError}
                </div>
              )}
            </div>

            {draft.type === "tempo" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="f">Jatuh tempo</label>
                  <input
                    type="date"
                    value={draft.due}
                    onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                  />
                </div>
                <div>
                  <label className="f">
                    Uang muka / bayar sebagian (opsional)
                  </label>
                  <MoneyInput
                    value={draft.paid}
                    onChange={(paid) => setDraft({ ...draft, paid })}
                  />
                </div>
              </div>
            )}
          </div>

          {overdueAck && currentOverdue.length > 0 && (
            <div
              className="mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] flex gap-2.5"
              style={{
                background: "var(--color-warn-bg)",
                border: "1px solid #f6e4a6",
                color: "var(--wa)",
              }}
            >
              <Icon name="alert" size={18} />
              <div>
                <b>Toko punya {currentOverdue.length} invoice menunggak</b>{" "}
                dengan total {rp(overdueTotal)}. Invoice baru tetap bisa
                diajukan; tunggakan dicatat di ringkasan approval.
              </div>
            </div>
          )}
        </Section>

        {/* ---------- 2. Barang ---------- */}
        <Section
          n={2}
          title="Barang"
          hint={`${draft.items.length} jenis · ${totalPcs} pcs`}
        >
          <div className="space-y-3">
            {draft.items.map((it, i) => {
              const info = priced[i];
              const hist = salePriceHistory(db, it.vid);
              const unitProfit = info.v ? it.price - info.v.cost : 0;
              const short = info.v ? info.stock - it.qty < 0 : false;
              return (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden bg-white"
                  style={{
                    border: "1px solid var(--ln)",
                    boxShadow: "0 1px 2px rgba(4,18,63,0.04)",
                  }}
                >
                  <div className="p-3.5 sm:p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className="text-[11px] font-extrabold uppercase"
                        style={{ color: "var(--mu)", letterSpacing: "0.08em" }}
                      >
                        Barang {i + 1}
                      </span>
                      <button
                        type="button"
                        className="grid place-items-center w-8 h-8 rounded-lg transition hover:bg-[#fdecec] disabled:opacity-30 disabled:pointer-events-none"
                        style={{ color: "var(--er)" }}
                        disabled={draft.items.length < 2}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            items: d.items.filter((_, idx) => idx !== i),
                          }))
                        }
                        aria-label={`Hapus barang ${i + 1}`}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2.5">
                      <div className="col-span-12 sm:col-span-6">
                        <label className="f">Produk / varian</label>
                        <select
                          value={it.vid}
                          onChange={(e) => {
                            const v = variants.find(
                              (x) => x.id === e.target.value,
                            );
                            setItem(i, {
                              vid: e.target.value,
                              price: v?.price ?? 0,
                            });
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
                      <div className="col-span-5 sm:col-span-2">
                        <label className="f">Qty</label>
                        <NumberInput
                          value={it.qty}
                          onChange={(qty) => setItem(i, { qty })}
                        />
                      </div>
                      <div className="col-span-7 sm:col-span-4">
                        <label className="f">Harga jual / pcs</label>
                        <MoneyInput
                          value={it.price}
                          onChange={(price) => setItem(i, { price })}
                        />
                      </div>
                    </div>
                  </div>

                  {info.v && (
                    <div
                      className="px-3.5 sm:px-4 py-3"
                      style={{
                        background: "#f7f8fc",
                        borderTop: "1px solid var(--ln)",
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div>
                          <div
                            className="text-[11px]"
                            style={{ color: "var(--mu)" }}
                          >
                            Modal / pcs
                          </div>
                          <div className="text-[13.5px] font-bold num">
                            {rp(info.v.cost)}
                          </div>
                        </div>
                        <div>
                          <div
                            className="text-[11px] mb-0.5"
                            style={{ color: "var(--mu)" }}
                          >
                            Laba / pcs
                          </div>
                          <Pill tone={unitProfit < 0 ? "er" : "ok"}>
                            {unitProfit < 0 ? "Rugi" : "Laba"}{" "}
                            <span className="num">
                              {rp(Math.abs(unitProfit))}
                            </span>
                          </Pill>
                        </div>
                        <div>
                          <div
                            className="text-[11px] mb-0.5"
                            style={{ color: "var(--mu)" }}
                          >
                            Stok
                          </div>
                          {short ? (
                            <Pill tone="wa">
                              <span className="num">
                                {info.stock} → {info.stock - it.qty}
                              </span>
                            </Pill>
                          ) : (
                            <Pill tone="mu">
                              <span className="num">{info.stock}</span>
                            </Pill>
                          )}
                        </div>
                        <div className="ml-auto text-right">
                          <div
                            className="text-[11px] num"
                            style={{ color: "var(--mu)" }}
                          >
                            {it.qty} × {rp(it.price)}
                          </div>
                          <div
                            className="text-[17px] font-extrabold num leading-tight"
                            style={{ color: "var(--nv)" }}
                          >
                            {rp(it.qty * it.price)}
                          </div>
                        </div>
                      </div>
                      <div
                        className="text-[11.5px] mt-2"
                        style={{ color: "var(--mu)" }}
                      >
                        Standar {rp(info.v.price)} (internal) ·{" "}
                        {hist
                          ? `histori jual ${rp(hist.min)} – ${rp(hist.max)} (${hist.count} transaksi, terakhir ${rp(hist.last)})`
                          : "belum ada histori harga jual"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition hover:border-[#c99300] hover:text-[#7a5800] hover:bg-[#fffaf0]"
            style={{
              border: "1.5px dashed #cfd5e2",
              color: "var(--in)",
            }}
            onClick={() => {
              const v = variants[3] ?? variants[0];
              if (!v) return;
              setDraft((d) => ({
                ...d,
                items: [...d.items, { vid: v.id, qty: 1, price: v.price }],
              }));
            }}
          >
            <Icon name="plus" /> Tambah barang
          </button>

          {stockWarnings.length > 0 && (
            <div
              className="mt-3 px-3.5 py-3 rounded-xl text-[12.5px] flex gap-2.5"
              style={{
                background: "var(--color-danger-bg)",
                color: "var(--er)",
              }}
              role="alert"
            >
              <Icon name="alert" size={18} />
              <div>
                <b>Stok tidak mencukupi.</b> Transaksi tetap dicatat, sisanya
                menjadi stok minus dan masuk daftar peringatan restock.
                <ul className="mt-1 space-y-0.5">
                  {stockWarnings.map((w, idx) => (
                    <li key={`${w.label}-${idx}`}>
                      • {w.label}: stok {w.from} → {w.to}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Section>

        {/* ---------- 3. Diskon & biaya ---------- */}
        <Section n={3} title="Diskon & biaya" hint="Opsional">
          <div className="rounded-2xl p-4 space-y-4" style={PANEL}>
            <div>
              <div
                className="text-[11px] font-extrabold uppercase mb-2"
                style={{ color: "var(--mu)", letterSpacing: "0.08em" }}
              >
                Diskon
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-12 sm:col-span-7">
                  <label className="f" htmlFor="sale-discount-note">
                    Keterangan diskon
                  </label>
                  <input
                    id="sale-discount-note"
                    value={draft.discountNote}
                    maxLength={120}
                    placeholder="Mis. Diskon 5 persen / khusus produk tertentu"
                    onChange={(e) =>
                      setDraft({ ...draft, discountNote: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-12 sm:col-span-5">
                  <label className="f">Nominal diskon (Rp)</label>
                  <MoneyInput
                    value={draft.discount}
                    onChange={(discount) => setDraft({ ...draft, discount })}
                  />
                </div>
              </div>
              {draft.discount > subtotal && (
                <div
                  className="text-[11.5px] mt-1.5"
                  style={{ color: "var(--er)" }}
                >
                  Diskon melebihi subtotal — yang dipotong maksimal{" "}
                  {rp(subtotal)}.
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--ln)" }} />

            <div>
              <div
                className="text-[11px] font-extrabold uppercase mb-2"
                style={{ color: "var(--mu)", letterSpacing: "0.08em" }}
              >
                Biaya operasional order
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="f">Ongkir</label>
                  <MoneyInput
                    value={draft.ship}
                    onChange={(ship) => setDraft({ ...draft, ship })}
                  />
                </div>
                <div>
                  <label className="f">Packing</label>
                  <MoneyInput
                    value={draft.pack}
                    onChange={(pack) => setDraft({ ...draft, pack })}
                  />
                </div>
                <div>
                  <label className="f">Biaya lain</label>
                  <MoneyInput
                    value={draft.other}
                    onChange={(other) => setDraft({ ...draft, other })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Ringkasan ---------- */}
        <div className="calcbox">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-extrabold uppercase"
              style={{ color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}
            >
              Ringkasan order
            </span>
            <span
              className="text-[11.5px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {draft.items.length} jenis · {totalPcs} pcs
            </span>
          </div>
          {discount > 0 && (
            <>
              <div className="flex justify-between py-1 text-[13px] muted">
                <span>Subtotal barang</span>
                <span className="num">{rp(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-[13px] muted">
                <span>
                  − Diskon
                  {draft.discountNote.trim() && ` (${draft.discountNote.trim()})`}
                </span>
                <span className="num">{rp(discount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline py-1">
            <span className="font-semibold">Total penjualan</span>
            <span className="num text-[20px] font-extrabold">{rp(total)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px] muted">
            <span>− Modal barang</span>
            <span className="num">{rp(modal)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px] muted">
            <span>− Biaya operasional</span>
            <span className="num">{rp(ops)}</span>
          </div>
          <hr className="my-2.5" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-base flex items-center gap-2">
              {profit < 0 ? "Rugi order" : "Laba order"}
              <span
                className="num text-[11.5px] font-bold rounded-full px-2 py-0.5"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: profit < 0 ? "#fca5a5" : "#fec40b",
                }}
              >
                {margin.toFixed(1)}%
              </span>
            </span>
            <span
              className="num gold font-extrabold text-[20px]"
              style={profit < 0 ? { color: "#fca5a5" } : undefined}
            >
              {rp(profit)}
            </span>
          </div>
        </div>

        <div
          className="mt-3 rounded-xl px-3.5 py-2.5 text-[12px] flex gap-2.5"
          style={{ background: "var(--color-warn-bg)", color: "var(--wa)" }}
        >
          <Icon name="info" size={16} />
          <div>
            Invoice diajukan ke Owner untuk approval — transaksi, pengurangan
            stok, dan pembayaran baru tercatat setelah disetujui. Rincian laba
            tiap jenis barang tampil di halaman Approval.
          </div>
        </div>
      </Drawer>

      <Picker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Toko"
        value={draft.customerId}
        options={db.customers
          .filter((c) => customerStatus(c) !== "Diarsipkan")
          .map((c) => ({
            id: c.id,
            name: c.name,
            sub: c.phone,
            badges:
              customerStatus(c) === "Menunggu" ? (
                <span className="bd b-wa">Menunggu approval</span>
              ) : undefined,
          }))}
        onSelect={(o) => {
          const customer = db.customers.find((c) => c.id === o.id);
          const overdue = customer ? overdueSales(db, customer) : [];
          setDraft((d) => ({
            ...d,
            customer: o.name,
            customerId: o.id,
          }));
          setOverdueAck(overdue.length === 0);
          setOverdueOpen(overdue.length > 0);
        }}
        onCreate={(name) => {
          const res = addCustomer({
            name,
            phone: newPhone,
            address: newAddress,
          });
          if (res.ok && res.customer) {
            toast(res.msg);
            setDraft((d) => ({
              ...d,
              customer: res.customer!.name,
              customerId: res.customer!.id,
            }));
            setNewPhone("");
            setNewAddress("");
            setOverdueAck(false);
            setOverdueOpen(false);
          }
          return res;
        }}
        createLabel="Tambah toko baru"
        createExtra={
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="f">No. HP (opsional)</label>
              <input
                aria-label="No. HP toko baru"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
              />
            </div>
            <div>
              <label className="f">Alamat (opsional)</label>
              <input
                aria-label="Alamat toko baru"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Jl. ..."
              />
            </div>
          </div>
        }
      />

      <OverdueWarningDialog
        open={overdueOpen}
        onClose={() => {
          setOverdueOpen(false);
          setOverdueAck(true);
        }}
        customerName={draft.customer}
        sales={currentOverdue}
        onChangeCustomer={() => {
          setOverdueOpen(false);
          setOverdueAck(false);
          setDraft((d) => ({
            ...d,
            customer: "",
            customerId: undefined,
          }));
          setPickerOpen(true);
        }}
      />
    </>
  );
}
