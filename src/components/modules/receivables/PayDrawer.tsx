"use client";

import { useState } from "react";
import { TODAY } from "@/lib/date";
import { rp } from "@/lib/format";
import { salePaid, saleProposed, saleTotal } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyInput } from "@/components/ui/NumericInput";

export function PayDrawer({
  saleId,
  onClose,
}: {
  saleId: string | null;
  onClose: () => void;
}) {
  const { db, recordPayment, toast } = useStore();
  const sale = db.sales.find((s) => s.id === saleId);
  const rem = sale ? saleTotal(sale) - salePaid(sale) : 0;
  const [date, setDate] = useState(TODAY);
  // Default-nya sisa tagihan (komponen di-remount per invoice oleh parent).
  const [amt, setAmt] = useState(rem);
  const [method, setMethod] = useState("Transfer");

  if (!sale) return null;

  const proposed = saleProposed(sale);
  const isPelunasan = amt >= rem;

  const submit = () => {
    const res = recordPayment(sale.id, { date, amt, method });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={Boolean(saleId)}
      onClose={onClose}
      title={`Catat pembayaran · ${sale.id}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            {isPelunasan ? "Ajukan pelunasan" : "Simpan"}
          </button>
        </>
      }
    >
      <div className="text-sm mb-3">
        Sisa tagihan <b className="num">{rp(rem)}</b>
        {proposed > 0 && (
          <div className="text-[12px] mt-1" style={{ color: "var(--wa)" }}>
            Ada pengajuan pelunasan Rp {rp(proposed)} yang menunggu approval
            Owner.
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="f">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="f">Jumlah</label>
          <MoneyInput value={amt} onChange={setAmt} />
        </div>
        <div>
          <label className="f">Metode</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Transfer</option>
            <option>Tunai</option>
            <option>QRIS</option>
          </select>
        </div>
      </div>
      <div
        className="sim mt-4"
        style={
          isPelunasan
            ? { background: "var(--wab)", borderColor: "#f6e4a6", color: "var(--wa)" }
            : undefined
        }
      >
        {isPelunasan
          ? "Pelunasan menjadi pengajuan — status invoice berubah menjadi Lunas setelah disetujui Owner."
          : "Pembayaran sebagian langsung berlaku pada invoice."}
      </div>
    </Drawer>
  );
}
