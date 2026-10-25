"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import {
  arStatus,
  itemProfit,
  saleCost,
  saleOps,
  salePaid,
  saleProfit,
  saleSub,
  saleTotal,
  variantLabel,
} from "@/lib/calc";
import { useStore } from "@/lib/store";
import { PageHead } from "@/components/ui/PageHead";

export function InvoiceView({ invoiceId }: { invoiceId?: string }) {
  const { db } = useStore();
  const fallback = db.sales[db.sales.length - 1]?.id ?? "";
  const [selected, setSelected] = useState(invoiceId ?? fallback);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** Skala lembar A4 mengikuti lebar layar supaya selalu tampil utuh (210mm = 794px). */
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const avail =
        el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setZoom(Math.min(1, Math.max(0.3, avail / 794)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sale = db.sales.find((s) => s.id === selected) ?? db.sales[db.sales.length - 1];
  if (!sale) {
    return <p className="text-sm">Belum ada invoice.</p>;
  }

  const b = db.biz;
  // Rekening tujuan transfer berasal dari data pelanggan; rekening utama toko
  // hanya dipakai bila pelanggan belum punya rekening sendiri.
  const customer =
    db.customers.find((c) => c.id === sale.customerId) ??
    db.customers.find((c) => c.name === sale.customer);
  const transferTo = customer?.bank?.trim() || b.bank;
  const st = arStatus(sale);
  const statusStyle =
    st === "Lunas"
      ? { background: "#E7F6EC", color: "#15803D" }
      : st === "Terlambat"
        ? { background: "#fdecec", color: "#b91c1c" }
        : { background: "#fdf3e1", color: "#b45309" };

  return (
    <>
      <PageHead
        title="Invoice"
        subtitle="Template A4 — akan disesuaikan dengan contoh invoice dari customer."
        actions={
          <>
            <select
              className="w-48"
              value={sale.id}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Pilih invoice"
            >
              {db.sales
                .slice()
                .reverse()
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn p"
              onClick={() => window.print()}
            >
              Cetak / Simpan PDF
            </button>
            <Link href="/settings" className="btn">
              Atur alamat toko
            </Link>
          </>
        }
      />

      <div className="invwrap" ref={wrapRef}>
        <div className="a4" style={{ zoom }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "3px solid #FEC40B",
              paddingBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "#04123F",
                  color: "#FEC40B",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                RK
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{b.name}</div>
                <div style={{ color: "#555", lineHeight: 1.5 }}>
                  {b.addr}
                  <br />
                  {b.phone} · {b.email}
                  <br />
                  NPWP {b.npwp}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: ".05em",
                  color: "#04123F",
                }}
              >
                INVOICE
              </div>
              <div style={{ marginTop: 4 }}>{sale.id}</div>
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontWeight: 700,
                    fontSize: 11,
                    ...statusStyle,
                  }}
                >
                  {st === "Lunas" ? "LUNAS" : "BELUM LUNAS"}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "18px 0",
            }}
          >
            <div>
              <div
                style={{
                  color: "#777",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Ditagihkan kepada
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 3 }}>
                {sale.customer}
              </div>
            </div>
            <div style={{ textAlign: "right", lineHeight: 1.7 }}>
              <span style={{ color: "#777" }}>Tanggal:</span> {formatDate(sale.date)}
              <br />
              <span style={{ color: "#777" }}>Jatuh tempo:</span>{" "}
              {sale.due ? formatDate(sale.due) : "Tunai"}
              <br />
              <span style={{ color: "#777" }}>Pembayaran:</span>{" "}
              {sale.type === "tempo" ? "Tempo" : "Tunai"}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5F7FB" }}>
                {["No", "Barang", "Qty", "Harga", "Jumlah"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: 8,
                      textAlign: i > 1 ? "right" : "left",
                      fontSize: 10.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sale.items.map((i, k) => (
                <tr key={i.vid} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{k + 1}</td>
                  <td style={{ padding: 8 }}>{variantLabel(db, i.vid)}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{i.qty}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{rp(i.price)}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {rp(i.qty * i.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <div style={{ width: 260, lineHeight: 2 }}>
              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>Subtotal</span>
                <span>{rp(saleTotal(sale))}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: 15,
                  borderTop: "2px solid #111",
                  paddingTop: 4,
                }}
              >
                <span>Total</span>
                <span>{rp(saleTotal(sale))}</span>
              </div>
              <div
                style={{ display: "flex", justifyContent: "space-between", color: "#555" }}
              >
                <span>Dibayar</span>
                <span>{rp(salePaid(sale))}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <span>Sisa tagihan</span>
                <span>{rp(Math.max(saleTotal(sale) - salePaid(sale), 0))}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ color: "#555", lineHeight: 1.6, fontSize: 11 }}>
              <b>Pembayaran transfer ke:</b>
              <br />
              {transferTo}
              <br />
              Mohon cantumkan no. invoice saat transfer.
            </div>
            <div style={{ textAlign: "center", width: 160 }}>
              <div>Hormat kami,</div>
              <div style={{ height: 60 }} />
              <div
                style={{
                  borderTop: "1px solid #333",
                  paddingTop: 4,
                  fontWeight: 600,
                }}
              >
                {b.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--mu)" }}>
        <Link href="/sales" style={{ color: "var(--gold-3)", fontWeight: 600 }}>
          ← Kembali ke daftar penjualan
        </Link>
      </p>

      {/* Panel internal: tidak ikut tercetak, tidak tampil di dokumen pelanggan. */}
      <div className="card p-5 mt-4 no-print">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-bold">Rincian internal invoice</div>
          <span className="text-xs" style={{ color: "var(--mu)" }}>
            Untuk akuntansi toko — tidak dicetak ke pelanggan
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--mu)" }}>
              Pembayaran
            </div>
            {sale.payments.length === 0 ? (
              <div className="text-[13px]" style={{ color: "var(--mu)" }}>
                Belum ada pembayaran
              </div>
            ) : (
              sale.payments.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[13px] py-1 border-b"
                  style={{ borderColor: "#F0F1F6" }}
                >
                  <span>
                    {formatDate(p.date)} · {p.method}
                    {p.status === "Diajukan" && (
                      <span style={{ color: "var(--wa)" }}> (diajukan)</span>
                    )}
                  </span>
                  <span className="num font-semibold">{rp(p.amt)}</span>
                </div>
              ))
            )}
            <div
              className="flex justify-between text-[13px] py-2 font-bold"
            >
              <span>Sisa tagihan</span>
              <span className="num">
                {rp(Math.max(saleTotal(sale) - salePaid(sale), 0))}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--mu)" }}>
              Laba transaksi
            </div>
            <div className="flex justify-between text-[13px] py-1 border-b" style={{ borderColor: "#F0F1F6" }}>
              <span style={{ color: "var(--mu)" }}>Total penjualan</span>
              <span className="num">{rp(saleSub(sale))}</span>
            </div>
            <div className="flex justify-between text-[13px] py-1 border-b" style={{ borderColor: "#F0F1F6" }}>
              <span style={{ color: "var(--mu)" }}>− Modal barang</span>
              <span className="num">{rp(saleCost(sale))}</span>
            </div>
            <div className="flex justify-between text-[13px] py-1 border-b" style={{ borderColor: "#F0F1F6" }}>
              <span style={{ color: "var(--mu)" }}>− Ongkos kirim &amp; biaya</span>
              <span className="num">{rp(saleOps(sale))}</span>
            </div>
            <div
              className="flex justify-between text-[14px] py-2 font-bold"
              style={{ color: saleProfit(sale) >= 0 ? "var(--ok)" : "var(--er)" }}
            >
              <span>Laba transaksi</span>
              <span className="num">{rp(saleProfit(sale))}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div
            className="text-[12px] font-bold uppercase tracking-wide mb-1"
            style={{ color: "var(--mu)" }}
          >
            Laba per barang (per unit)
          </div>
          {sale.items.map((i) => (
            <div
              key={i.vid}
              className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px] py-1 border-b"
              style={{ borderColor: "#F0F1F6" }}
            >
              <span className="font-semibold" style={{ color: "var(--nv)" }}>
                {variantLabel(db, i.vid)}
              </span>
              <span className="num" style={{ color: "var(--mu)" }}>
                {i.qty} × {rp(i.price)} · modal {rp(i.cost)}/unit
              </span>
              <span
                className="num"
                style={{ color: itemProfit(i) >= 0 ? "var(--ok)" : "var(--er)" }}
              >
                laba {rp(itemProfit(i))}/unit · total{" "}
                {rp(itemProfit(i) * i.qty)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
