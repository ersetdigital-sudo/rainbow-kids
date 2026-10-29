"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, TODAY } from "@/lib/date";
import { rp, initials } from "@/lib/format";
import {
  arStatus,
  customerStatus,
  itemProfit,
  overdueSales,
  saleCost,
  saleOps,
  salePaid,
  saleProfit,
  saleProposed,
  saleSub,
  saleTotal,
  variantLabel,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyInput } from "@/components/ui/NumericInput";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { SaleEditPanel } from "./SaleEditPanel";

const ICON = {
  pencil:
    '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
  trash:
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
};

export function SaleDetailDrawer({
  saleId,
  onClose,
}: {
  saleId: string | null;
  onClose: () => void;
}) {
  const { db, recordPayment, requestSaleDelete, toast } = useStore();
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(TODAY);
  const [payAmt, setPayAmt] = useState(0);
  const [payMethod, setPayMethod] = useState("Transfer");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState<"ringkasan" | "barang" | "bayar">("ringkasan");
  const [moreOpen, setMoreOpen] = useState(false);

  const sale = db.sales.find((s) => s.id === saleId) ?? null;

  if (!sale) return null;

  /** Ada pengajuan ubah harga & biaya yang menunggu approval Owner? */
  const pendingRevision = db.approvals.some(
    (a) => a.kind === "sale" && a.saleId === sale.id && a.status === "Menunggu",
  );
  const pendingDelete = db.approvals.find(
    (a) =>
      a.kind === "saleDelete" &&
      a.saleId === sale.id &&
      a.status === "Menunggu",
  );
  const locked = Boolean(pendingDelete);

  const total = saleTotal(sale);
  const paid = salePaid(sale);
  const rem = total - paid;
  const proposed = saleProposed(sale);
  const status = arStatus(sale);
  const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  const customer =
    db.customers.find((c) => c.id === sale.customerId) ??
    db.customers.find((c) => c.name === sale.customer) ??
    null;
  const customerSt = customer ? customerStatus(customer) : "Aktif";
  const overdue = overdueSales(db, {
    id: sale.customerId,
    name: sale.customer,
  });
  const invoiceApproval = db.approvals.find(
    (a) => a.kind === "invoice" && a.saleId === sale.id,
  );
  const creator = invoiceApproval?.user ?? db.user ?? "—";
  const pcs = sale.items.reduce((a, i) => a + i.qty, 0);
  const typeLabel = sale.type === "tempo" ? "Tempo" : "Tunai";

  /** Hitung mundur jatuh tempo, relatif ke tanggal acuan aplikasi. */
  const dueNote = (() => {
    if (!sale.due || rem <= 0) return null;
    const ms =
      new Date(`${sale.due}T00:00`).getTime() -
      new Date(`${TODAY}T00:00`).getTime();
    const days = Math.round(ms / 86400000);
    if (days > 0) return `${days} hari lagi`;
    if (days === 0) return "jatuh tempo hari ini";
    return `lewat ${Math.abs(days)} hari`;
  })();

  /** Riwayat order: pengajuan, keputusan Owner, pembayaran, lunas. */
  type Step = {
    key: string;
    title: string;
    meta: string;
    state: "done" | "current" | "todo" | "bad";
  };
  const steps: Step[] = [];
  steps.push({
    key: "created",
    title: `Diajukan ${invoiceApproval?.user ?? creator}`,
    meta: invoiceApproval?.time ?? formatDate(sale.date),
    state: "done",
  });
  if (invoiceApproval?.by) {
    steps.push({
      key: "approved",
      title: `Disetujui ${invoiceApproval.by}`,
      meta: invoiceApproval.decidedAt ?? "—",
      state: "done",
    });
  }
  sale.payments.forEach((p, idx) => {
    const waiting = p.status === "Diajukan";
    const rejected = p.status === "Ditolak";
    steps.push({
      key: `pay-${idx}`,
      title: `${waiting ? "Pengajuan pelunasan" : "Bayar"} ${rp(p.amt)} · ${p.method}`,
      meta: `${formatDate(p.date)}${
        waiting ? " · menunggu approval" : rejected ? " · ditolak" : ""
      }`,
      state: rejected ? "bad" : waiting ? "current" : "done",
    });
  });
  steps.push({
    key: "paid",
    title: "Lunas",
    meta:
      rem <= 0
        ? "tagihan sudah lunas"
        : sale.due
          ? `jatuh tempo ${formatDate(sale.due)}`
          : "menunggu sisa pembayaran",
    state: rem <= 0 ? "done" : "todo",
  });

  const submitPayment = () => {
    const res = recordPayment(sale.id, {
      date: payDate,
      amt: payAmt,
      method: payMethod,
    });
    toast(res.msg);
    if (res.ok) {
      setPayOpen(false);
      setPayAmt(0);
    }
  };

  const openPay = () => {
    setMoreOpen(false);
    setEditOpen(false);
    setPayOpen(true);
    setPayAmt(rem);
    setTab("bayar");
  };
  const openEdit = () => {
    setMoreOpen(false);
    setPayOpen(false);
    setEditOpen(true);
    setTab("barang");
  };
  const openDelete = () => {
    setMoreOpen(false);
    setEditOpen(false);
    setPayOpen(false);
    setDeleteOpen(true);
  };

  const copyId = () => {
    if (!navigator.clipboard) {
      toast("Browser tidak mendukung salin");
      return;
    }
    navigator.clipboard
      .writeText(sale.id)
      .then(() => toast("Nomor invoice disalin"))
      .catch(() => toast("Gagal menyalin nomor invoice"));
  };

  const actionIcon = (path: string) => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );

  return (
    <>
      <Drawer
        open={Boolean(saleId)}
        onClose={onClose}
        wide
        title={`Detail penjualan ${sale.id}`}
        header={
          <div className="sd2-head">
            <div className="sd2-head-ic" aria-hidden="true">
              {actionIcon(ICON.bag)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="sale-head-idrow">
                <h3 className="dtitle sale-head-id">{sale.id}</h3>
                <button
                  type="button"
                  className="sale-copy"
                  onClick={copyId}
                  aria-label="Salin nomor invoice"
                >
                  {actionIcon(ICON.copy)}
                </button>
                <Badge tone={status}>{status}</Badge>
              </div>
              <div className="sale-head-meta">
                {formatDate(sale.date)} · {typeLabel}
                {sale.type === "tempo" && sale.due
                  ? ` s/d ${formatDate(sale.due)}`
                  : ""}{" "}
                · dicatat {creator}
                {invoiceApproval?.by ? ` · disetujui ${invoiceApproval.by}` : ""}
              </div>
            </div>
          </div>
        }
        footer={
          <div className="sd2-foot">
            <button
              type="button"
              className="btn sd2-del sd2-desk"
              disabled={locked}
              onClick={openDelete}
            >
              {actionIcon(ICON.trash)}
              Ajukan hapus
            </button>
            <div className="sd2-spacer sd2-desk" />
            <button
              type="button"
              className="btn sd2-desk"
              disabled={pendingRevision || locked || editOpen}
              onClick={openEdit}
            >
              {actionIcon(ICON.pencil)}
              Ubah harga &amp; biaya
            </button>

            <div className="sd2-more sd2-mob">
              <button
                type="button"
                className="btn sd2-more-btn"
                aria-label="Aksi lainnya"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
              >
                {actionIcon(ICON.dots)}
              </button>
              {moreOpen && (
                <div className="sd2-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pendingRevision || locked || editOpen}
                    onClick={openEdit}
                  >
                    {actionIcon(ICON.pencil)}
                    Ubah harga &amp; biaya
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="danger"
                    disabled={locked}
                    onClick={openDelete}
                  >
                    {actionIcon(ICON.trash)}
                    Ajukan hapus order
                  </button>
                </div>
              )}
            </div>

            {rem > 0 && (
              <Link
                href={`/invoice/${sale.id}`}
                className="btn"
                onClick={onClose}
              >
                {actionIcon(ICON.doc)}
                <span className="sd2-desk-inline">Lihat invoice</span>
                <span className="sd2-mob-inline">Invoice</span>
              </Link>
            )}
            {rem > 0 ? (
              <button
                type="button"
                className="btn p sd2-primary"
                disabled={locked || payOpen || editOpen}
                onClick={openPay}
              >
                {actionIcon(ICON.card)}
                Catat pembayaran
              </button>
            ) : (
              <Link
                href={`/invoice/${sale.id}`}
                className="btn p sd2-primary"
                onClick={onClose}
              >
                {actionIcon(ICON.doc)}
                Lihat invoice
              </Link>
            )}
          </div>
        }
      >
        {locked && pendingDelete && (
          <div className="sale-banner danger mb-3">
            <b>Pengajuan hapus order menunggu approval Owner.</b>
            {pendingDelete.reason ? ` Alasan: ${pendingDelete.reason}.` : ""}{" "}
            Ubah harga dan catat pembayaran dikunci sementara.
          </div>
        )}

        {pendingRevision && (
          <div className="sale-banner warn mb-3">
            Pengajuan ubah harga &amp; biaya invoice ini menunggu approval Owner.
          </div>
        )}

        <div className="sd2" data-tab={tab}>
          <div className="sd2-col sd2-side">
            <div className="sd2-sum">
              <div className="sd2-sum-l">
                {rem > 0 ? "Sisa tagihan" : "Total tagihan"}
              </div>
              <div className={`sd2-sum-v num${rem > 0 ? " gold" : ""}`}>
                {rp(rem > 0 ? rem : total)}
              </div>
              {rem > 0 && (
                <div className="sd2-sum-sub">dari total {rp(total)}</div>
              )}
              <div className="sale-progress" aria-hidden="true">
                <span style={{ width: `${paidPct}%` }} />
              </div>
              <div className="sd2-sum-row">
                <span>
                  Dibayar <b className="num">{rp(paid)}</b>
                </span>
                <span>{Math.round(paidPct)}%</span>
              </div>
              {sale.due && rem > 0 && (
                <div className="sd2-due">
                  {actionIcon(ICON.cal)}
                  <span>
                    Jatuh tempo <b>{formatDate(sale.due)}</b>
                    {dueNote ? ` · ${dueNote}` : ""}
                  </span>
                </div>
              )}
              {rem <= 0 && (
                <div className="sd2-due ok">
                  {actionIcon(ICON.check)}
                  <span>Tagihan sudah lunas</span>
                </div>
              )}
            </div>

            <div className="sd2-tabs" role="tablist" aria-label="Bagian detail">
              {(
                [
                  ["ringkasan", "Ringkasan"],
                  ["barang", `Barang · ${sale.items.length}`],
                  ["bayar", "Pembayaran"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "on" : undefined}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="sd2-box sd2-t-ringkasan sd2-o-profit">
              <div className="sd2-line">
                <span>Penjualan</span>
                <span className="num">{rp(saleSub(sale))}</span>
              </div>
              <div className="sd2-line">
                <span>Modal barang</span>
                <span className="num">− {rp(saleCost(sale))}</span>
              </div>
              <div className="sd2-line">
                <span>Biaya operasional</span>
                <span className="num">− {rp(saleOps(sale))}</span>
              </div>
              <div className="sale-profit-box">
                <span>Laba order</span>
                <span className="num">{rp(saleProfit(sale))}</span>
              </div>
            </div>

            <div className="sd2-t-ringkasan sd2-o-time">
              <div className="sd2-title">Riwayat order</div>
              <ol className="sd2-steps">
                {steps.map((st) => (
                  <li key={st.key} className={`sd2-step ${st.state}`}>
                    <span className="sd2-dot" aria-hidden="true">
                      {st.state === "done" && actionIcon(ICON.check)}
                    </span>
                    <span className="min-w-0">
                      <span className="sd2-step-t">{st.title}</span>
                      <span className="sd2-step-m">{st.meta}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="sd2-col sd2-main">
            <div className="sale-customer sd2-t-ringkasan sd2-o-cust">
              <div className="sale-cust-av">{initials(sale.customer)}</div>
              <div className="min-w-0 flex-1">
                <div
                  className="font-bold text-[14px]"
                  style={{ color: "var(--nv)" }}
                >
                  {sale.customer}
                </div>
                <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                  {[customer?.phone, customer?.address]
                    .filter(Boolean)
                    .join(" · ") || "Toko"}
                </div>
              </div>
              <div className="sd2-cust-badges">
                {customerSt === "Menunggu" && (
                  <span className="bd b-wa">Menunggu approval</span>
                )}
                {customerSt === "Diarsipkan" && (
                  <span className="bd b-in">Diarsipkan</span>
                )}
                {overdue.length > 0 && (
                  <span className="bd b-er">
                    Ada tunggakan {overdue.length} invoice
                  </span>
                )}
              </div>
            </div>

            <div className="sd2-t-barang sd2-o-items">
              <div className="sale-sec-head">
                <span>Barang</span>
                <span className="sale-sec-sub">
                  {sale.items.length} jenis · {pcs} pcs
                </span>
              </div>
              <div className="sd2-items">
                <div className="sd2-ihead" aria-hidden="true">
                  <span>Produk</span>
                  <span>Qty</span>
                  <span>Laba/unit</span>
                  <span>Subtotal</span>
                </div>
                {sale.items.map((i, idx) => {
                  const name = variantLabel(db, i.vid);
                  const profit = itemProfit(i);
                  return (
                    <div className="sd2-irow" key={`${i.vid}-${idx}`}>
                      <div className="sd2-iprod">
                        <div className="sale-thumb">{initials(name)}</div>
                        <div className="min-w-0">
                          <div className="sd2-iname">{name}</div>
                          <div className="sd2-isub">
                            <span className="sd2-mob-inline">
                              {i.qty} × {rp(i.price)} · modal {rp(i.cost)}
                            </span>
                            <span className="sd2-desk-inline">
                              {rp(i.price)} · modal {rp(i.cost)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="sd2-iqty num">{i.qty}</span>
                      <span
                        className={`sd2-imargin num ${profit >= 0 ? "pos" : "neg"}`}
                      >
                        {profit >= 0 ? "+" : "−"}
                        {rp(Math.abs(profit))}
                        <span className="sd2-mob-inline"> / unit</span>
                      </span>
                      <span className="sd2-isubtotal num">
                        {rp(i.qty * i.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sd2-costs sd2-t-barang sd2-o-costs">
              <div className="sd2-box">
                <div className="sd2-title">Rincian tagihan</div>
                <div className="sd2-line">
                  <span>Subtotal produk</span>
                  <span className="num">{rp(saleSub(sale))}</span>
                </div>
                <div className="sd2-line">
                  <span>Jumlah barang</span>
                  <span className="num">{pcs} pcs</span>
                </div>
                <div className="sd2-line total">
                  <span>Total tagihan</span>
                  <span className="num">{rp(total)}</span>
                </div>
              </div>
              <div className="sd2-box">
                <div className="sd2-title">Biaya operasional (internal)</div>
                <div className="sd2-line">
                  <span>Ongkir</span>
                  <span className="num">{rp(sale.ship)}</span>
                </div>
                <div className="sd2-line">
                  <span>Packing</span>
                  <span className="num">{rp(sale.pack)}</span>
                </div>
                {+sale.other > 0 && (
                  <div className="sd2-line">
                    <span>Biaya lain</span>
                    <span className="num">{rp(sale.other)}</span>
                  </div>
                )}
                <div className="sd2-line total">
                  <span>Total biaya</span>
                  <span className="num">{rp(saleOps(sale))}</span>
                </div>
              </div>
            </div>

            {editOpen && !locked && (
              <div className="sd2-t-barang sd2-o-edit">
                <SaleEditPanel sale={sale} onClose={() => setEditOpen(false)} />
              </div>
            )}

            <div className="sd2-t-bayar sd2-o-pay">
              <div className="sale-sec-head">
                <span>Pembayaran</span>
                <span className="sale-sec-sub">
                  {proposed > 0
                    ? "Ada pengajuan menunggu"
                    : `${rp(paid)} dibayar`}
                </span>
              </div>

              {sale.payments.length === 0 ? (
                <div className="sale-empty-pay">Belum ada pembayaran</div>
              ) : (
                <div>
                  {sale.payments.map((p, i) => (
                    <div className="sale-pay-row" key={i}>
                      <div className="min-w-0">
                        <div style={{ color: "var(--nv)" }}>
                          {formatDate(p.date)} · {p.method}
                        </div>
                        {p.status === "Diajukan" && (
                          <Badge tone="Menunggu">Menunggu approval</Badge>
                        )}
                        {p.status === "Ditolak" && (
                          <Badge tone="Ditolak">Ditolak</Badge>
                        )}
                      </div>
                      <b className="num" style={{ color: "var(--nv)" }}>
                        {rp(p.amt)}
                      </b>
                    </div>
                  ))}
                </div>
              )}

              {proposed > 0 && (
                <div className="sale-banner warn mt-2">
                  Pengajuan pelunasan {rp(proposed)} menunggu approval Owner.
                </div>
              )}

              {payOpen && !locked && (
                <div className="sale-pay-form">
                  <div className="text-sm mb-3">
                    Sisa tagihan <b className="num">{rp(rem)}</b>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="f">Tanggal</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="f">Jumlah</label>
                      <MoneyInput value={payAmt} onChange={setPayAmt} />
                    </div>
                    <div>
                      <label className="f">Metode</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                      >
                        <option>Transfer</option>
                        <option>Tunai</option>
                        <option>QRIS</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn s"
                      onClick={() => setPayOpen(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn s p"
                      onClick={submitPayment}
                    >
                      {payAmt >= rem ? "Ajukan pelunasan" : "Simpan pembayaran"}
                    </button>
                  </div>
                  {payAmt >= rem && (
                    <div
                      className="text-[11.5px] mt-2"
                      style={{ color: "var(--wa)" }}
                    >
                      Pelunasan tidak langsung berlaku — Owner harus menyetujui
                      pengajuannya di menu Approval.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      <ReasonDialog
        key={`delete-sale-${sale.id}`}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Ajukan hapus order"
        description={`Order ${sale.id} milik ${sale.customer} akan dihapus setelah disetujui Owner. Stok setiap barang dikembalikan dan approval ubah harga/pelunasan yang masih menunggu otomatis ditolak.`}
        placeholder="Contoh: order dibatalkan toko / salah input"
        onConfirm={(reason) => {
          const res = requestSaleDelete(sale.id, reason);
          toast(res.msg);
          if (res.ok) setDeleteOpen(false);
          return res;
        }}
      />
    </>
  );
}
