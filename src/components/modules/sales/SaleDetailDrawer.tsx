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
  const creator =
    db.approvals.find((a) => a.kind === "invoice" && a.saleId === sale.id)
      ?.user ??
    db.user ??
    "—";

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
        narrow
        title={`Detail penjualan ${sale.id}`}
        header={
          <div>
            <div className="dkick">DETAIL PENJUALAN</div>
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
            </div>
            <div className="sale-head-meta">
              {formatDate(sale.date)} ·{" "}
              {sale.type === "tempo" ? "Tempo" : "Tunai"} · dicatat oleh{" "}
              {creator}
            </div>
          </div>
        }
        footer={
          <div className="sale-actions">
            <button
              type="button"
              className="btn sale-act"
              disabled={pendingRevision || locked || editOpen}
              onClick={() => setEditOpen(true)}
            >
              {actionIcon(ICON.pencil)}
              Ubah harga
            </button>
            <Link href={`/invoice/${sale.id}`} className="btn sale-act" onClick={onClose}>
              {actionIcon(ICON.doc)}
              Invoice
            </Link>
            <button
              type="button"
              className="btn soft-danger sale-act"
              disabled={locked}
              onClick={() => {
                setEditOpen(false);
                setPayOpen(false);
                setDeleteOpen(true);
              }}
            >
              {actionIcon(ICON.trash)}
              Ajukan hapus
            </button>
            {rem > 0 ? (
              <button
                type="button"
                className="btn p sale-primary"
                disabled={locked || payOpen || editOpen}
                onClick={() => {
                  setPayOpen(true);
                  setPayAmt(rem);
                }}
              >
                {actionIcon(ICON.card)}
                Catat pembayaran
              </button>
            ) : (
              <Link
                href={`/invoice/${sale.id}`}
                className="btn p sale-primary"
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

        <div className="sale-summary">
          <div className="sale-summary-top">
            <div>
              <div className="sale-summary-label">Total tagihan</div>
              <div className="sale-summary-total num">{rp(total)}</div>
            </div>
            <span className="bd b-ac">
              {status}
              {sale.type === "tempo" && sale.due
                ? ` · ${formatDate(sale.due)}`
                : ""}
            </span>
          </div>
          <div className="sale-progress" aria-hidden="true">
            <span style={{ width: `${paidPct}%` }} />
          </div>
          <div className="sale-metrics">
            <div className="sale-metric">
              <div className="l">Dibayar</div>
              <div className="v num">{rp(paid)}</div>
            </div>
            <div className="sale-metric">
              <div className="l">Sisa</div>
              <div className="v num gold">{rp(Math.max(rem, 0))}</div>
            </div>
            <div className="sale-metric">
              <div className="l">Laba order</div>
              <div className="v num ok">{rp(saleProfit(sale))}</div>
            </div>
          </div>
        </div>

        <div className="sale-customer mt-3">
          <div className="sale-cust-av">{initials(sale.customer)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[14px]" style={{ color: "var(--nv)" }}>
              {sale.customer}
            </div>
            <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
              {customer?.phone ? customer.phone : "Toko"}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {customerSt === "Menunggu" && (
                <span className="bd b-wa">Menunggu approval</span>
              )}
              {customerSt === "Diarsipkan" && (
                <span className="bd b-in">Diarsipkan</span>
              )}
              {overdue.length > 0 && (
                <span className="bd b-er">Ada tunggakan</span>
              )}
            </div>
          </div>
        </div>

        <div className="sale-sec-head">
          <span>Barang</span>
          <span className="sale-sec-sub">
            {sale.items.length} item ·{" "}
            {sale.items.reduce((a, i) => a + i.qty, 0)} pcs
          </span>
        </div>
        <div>
          {sale.items.map((i, idx) => {
            const name = variantLabel(db, i.vid);
            const profit = itemProfit(i);
            return (
              <div className="sale-item" key={`${i.vid}-${idx}`}>
                <div className="sale-thumb">{initials(name)}</div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-[13.5px]"
                    style={{ color: "var(--nv)" }}
                  >
                    {name}
                  </div>
                  <div className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                    {i.qty} × {rp(i.price)} · modal {rp(i.cost)}
                  </div>
                  <span
                    className={`sale-margin ${profit >= 0 ? "pos" : "neg"}`}
                  >
                    {profit >= 0 ? "+" : "−"}
                    {rp(Math.abs(profit))} / unit
                  </span>
                </div>
                <div
                  className="num font-bold whitespace-nowrap text-[13.5px]"
                  style={{ color: "var(--nv)" }}
                >
                  {rp(i.qty * i.price)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sale-cost">
          <div className="sale-cost-row">
            <span>Subtotal produk</span>
            <span className="num">{rp(saleSub(sale))}</span>
          </div>
          <div className="sale-cost-row">
            <span>Ongkir</span>
            <span className="num">{rp(sale.ship)}</span>
          </div>
          <div className="sale-cost-row">
            <span>Packing</span>
            <span className="num">{rp(sale.pack)}</span>
          </div>
          {+sale.other > 0 && (
            <div className="sale-cost-row">
              <span>Biaya lain</span>
              <span className="num">{rp(sale.other)}</span>
            </div>
          )}
          <div className="sale-cost-total">
            <span>Total penjualan</span>
            <span className="num">{rp(total)}</span>
          </div>
        </div>

        <div className="sale-sec-head">
          <span>Pembayaran</span>
          <span className="sale-sec-sub">
            {proposed > 0 ? "Ada pengajuan menunggu" : `${rp(paid)} dibayar`}
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
              <button type="button" className="btn s p" onClick={submitPayment}>
                {payAmt >= rem ? "Ajukan pelunasan" : "Simpan pembayaran"}
              </button>
            </div>
            {payAmt >= rem && (
              <div className="text-[11.5px] mt-2" style={{ color: "var(--wa)" }}>
                Pelunasan tidak langsung berlaku — Owner harus menyetujui
                pengajuannya di menu Approval.
              </div>
            )}
          </div>
        )}

        <div className="sale-sec-head">
          <span>Perhitungan laba</span>
        </div>
        <div className="sale-profit-lines">
          <div>
            <span>Total penjualan</span>
            <span className="num">{rp(saleSub(sale))}</span>
          </div>
          <div>
            <span>− Modal barang</span>
            <span className="num">{rp(saleCost(sale))}</span>
          </div>
          <div>
            <span>− Ongkir + packing + lain</span>
            <span className="num">{rp(saleOps(sale))}</span>
          </div>
        </div>
        <div className="sale-profit-box">
          <span>Laba order</span>
          <span className="num">{rp(saleProfit(sale))}</span>
        </div>

        {editOpen && !locked && (
          <SaleEditPanel sale={sale} onClose={() => setEditOpen(false)} />
        )}
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
