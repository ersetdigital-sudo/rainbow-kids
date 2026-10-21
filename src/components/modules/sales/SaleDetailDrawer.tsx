"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, TODAY } from "@/lib/date";
import { rp, initials } from "@/lib/format";
import {
  arStatus,
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

const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  shop: '<path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18"/>',
  cash: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
};

function Head({ icon, title, extra }: { icon: string; title: string; extra?: string }) {
  return (
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
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      </span>
      <span>{title}</span>
      {extra && (
        <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
          {extra}
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex justify-between gap-3 py-1.5 ${className}`}>
      <span style={{ color: "var(--mu)" }}>{label}</span>
      <span className="num text-right">{value}</span>
    </div>
  );
}

export function SaleDetailDrawer({
  saleId,
  onClose,
}: {
  saleId: string | null;
  onClose: () => void;
}) {
  const { db, recordPayment, toast } = useStore();
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(TODAY);
  const [payAmt, setPayAmt] = useState(0);
  const [payMethod, setPayMethod] = useState("Transfer");

  const sale = db.sales.find((s) => s.id === saleId) ?? null;

  if (!sale) return null;

  const rem = saleTotal(sale) - salePaid(sale);
  const proposed = saleProposed(sale);
  const status = arStatus(sale);
  const methods = sale.payments.length
    ? [...new Set(sale.payments.map((p) => p.method))].join(", ")
    : sale.type === "tempo"
      ? `Tempo s/d ${formatDate(sale.due)}`
      : "Tunai";

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

  return (
    <Drawer
      open={Boolean(saleId)}
      onClose={onClose}
      title="Detail Penjualan"
      footer={
        <>
          {rem > 0 && !payOpen && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPayOpen(true);
                setPayAmt(rem);
              }}
            >
              Catat pembayaran
            </button>
          )}
          <Link href={`/invoice/${sale.id}`} className="btn" onClick={onClose}>
            Lihat invoice
          </Link>
          <button type="button" className="btn p" onClick={onClose}>
            Tutup
          </button>
        </>
      }
    >
      <div className="sdtop">
        <div>
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            No. Penjualan
          </div>
          <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
            {sale.id}
          </div>
        </div>
        <Badge tone={status}>{status}</Badge>
      </div>

      <div className="sdc">
        <Head icon={ICONS.user} title="Pelanggan" />
        <div className="font-bold">{sale.customer}</div>
        <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)" }}>
          {sale.type === "tempo"
            ? `Pembayaran tempo · jatuh tempo ${formatDate(sale.due)}`
            : "Pembayaran tunai"}
        </div>
      </div>

      <div className="sdc">
        <Head icon={ICONS.shop} title="Rainbow Kids Official" extra={`${sale.items.length} item`} />
        {sale.items.map((i) => {
          const name = variantLabel(db, i.vid);
          return (
            <div className="sdp" key={i.vid}>
              <div className="sdth">{initials(name)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]" style={{ color: "var(--nv)" }}>
                  {name}
                </div>
                <div className="text-[12.5px]" style={{ color: "var(--mu)" }}>
                  {i.qty} × {rp(i.price)} · <span>modal {rp(i.cost)}</span>
                </div>
              </div>
              <div className="font-bold num whitespace-nowrap" style={{ color: "var(--nv)" }}>
                {rp(i.qty * i.price)}
              </div>
            </div>
          );
        })}
        <div
          className="text-[13px] mt-2 pt-2 border-t"
          style={{ borderColor: "var(--ln)" }}
        >
          <Row label="Subtotal produk" value={rp(saleSub(sale))} />
          <Row label="Ongkir" value={rp(sale.ship)} />
          <Row label="Packing" value={rp(sale.pack)} />
          {+sale.other ? <Row label="Biaya lain" value={rp(sale.other)} /> : null}
        </div>
        <div className="sdtot">
          <span>Total Penjualan</span>
          <span className="num">{rp(saleTotal(sale))}</span>
        </div>
      </div>

      <div className="sdc">
        <Head icon={ICONS.cash} title="Metode Pembayaran" extra={methods} />
        <div className="text-[13px]">
          {sale.payments.length ? (
            sale.payments.map((p, i) => (
              <div key={i}>
                <Row
                  label={`${formatDate(p.date)} · ${p.method}`}
                  value={rp(p.amt)}
                />
                {p.status === "Diajukan" && (
                  <div className="flex justify-end">
                    <Badge tone="Menunggu Pelunasan">
                      Menunggu approval Owner
                    </Badge>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-1" style={{ color: "var(--mu)" }}>
              Belum ada pembayaran
            </div>
          )}
          <div className="border-t mt-1 pt-2">
            <Row
              label={<b style={{ color: "var(--tx)" }}>Sisa tagihan</b>}
              value={
                <b style={{ color: rem > 0 ? "var(--er)" : "var(--ok)" }}>
                  {rp(Math.max(rem, 0))}
                </b>
              }
            />
            {proposed > 0 && (
              <Row
                label="Pengajuan pelunasan (menunggu approval)"
                value={rp(proposed)}
              />
            )}
          </div>
        </div>

        {payOpen && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: "#F5F7FB" }}>
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
                <input
                  type="number"
                  value={payAmt}
                  onChange={(e) => setPayAmt(+e.target.value)}
                />
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
              <button type="button" className="btn s" onClick={() => setPayOpen(false)}>
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
      </div>

      <div className="sdc">
        <Head icon={ICONS.trend} title="Perhitungan Laba" />
        <div className="text-[13px]">
          <Row label="Total penjualan" value={rp(saleSub(sale))} />
          <Row label="− Modal barang" value={rp(saleCost(sale))} />
          <Row label="− Ongkir + packing + lain" value={rp(saleOps(sale))} />
        </div>
        <div className="sdprof">
          <span>Laba order</span>
          <span className="num">{rp(saleProfit(sale))}</span>
        </div>
      </div>

      <div className="text-[13px] px-1">
        <Row label="No. Penjualan" value={<b style={{ color: "var(--nv)" }}>{sale.id}</b>} />
        <Row
          label="Tanggal transaksi"
          value={<b style={{ color: "var(--nv)" }}>{formatDate(sale.date)}</b>}
        />
        {sale.type === "tempo" && (
          <Row
            label="Jatuh tempo"
            value={<b style={{ color: "var(--nv)" }}>{formatDate(sale.due)}</b>}
          />
        )}
      </div>
    </Drawer>
  );
}
