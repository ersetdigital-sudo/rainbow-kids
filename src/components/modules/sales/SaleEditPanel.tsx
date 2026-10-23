"use client";

import { useState } from "react";
import { rp } from "@/lib/format";
import { saleCost, saleOps, saleSub, variantLabel } from "@/lib/calc";
import { useStore } from "@/lib/store";
import type { Sale } from "@/lib/types";

/**
 * Ubah harga jual per unit dan biaya operasional sebuah invoice.
 * Perubahan tidak langsung berlaku — diajukan ke Owner untuk approval.
 */
export function SaleEditPanel({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const { db, requestSaleRevision, toast } = useStore();
  const [items, setItems] = useState(() => sale.items.map((i) => ({ ...i })));
  const [ship, setShip] = useState(sale.ship);
  const [pack, setPack] = useState(sale.pack);
  const [other, setOther] = useState(sale.other);

  const next = { ...sale, items, ship: +ship, pack: +pack, other: +other };
  const nextProfit = saleSub(next) - saleCost(next) - saleOps(next);
  const curProfit = saleSub(sale) - saleCost(sale) - saleOps(sale);

  const setPrice = (index: number, price: number) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, price } : it)));

  const submit = () => {
    const res = requestSaleRevision(sale.id, {
      items,
      ship: +ship,
      pack: +pack,
      other: +other,
    });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
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
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </span>
        <span>Ubah harga &amp; biaya</span>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={it.vid}>
            <label className="f">{variantLabel(db, it.vid)}</label>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4 text-[12.5px]" style={{ color: "var(--mu)" }}>
                {it.qty} unit · modal {rp(it.cost)}
              </div>
              <div className="col-span-8">
                <input
                  type="number"
                  aria-label={`Harga jual ${variantLabel(db, it.vid)}`}
                  value={it.price}
                  onChange={(e) => setPrice(i, +e.target.value)}
                />
              </div>
            </div>
            <div className="text-[11.5px] mt-1" style={{ color: "var(--mu)" }}>
              Laba/unit {rp(it.price - it.cost)} · sebelumnya {rp(sale.items[i].price)}
            </div>
          </div>
        ))}
      </div>

      <div className="dsec">Biaya operasional order</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="f">Ekspedisi / ongkir</label>
          <input
            type="number"
            value={ship}
            onChange={(e) => setShip(+e.target.value)}
          />
        </div>
        <div>
          <label className="f">Packing</label>
          <input
            type="number"
            value={pack}
            onChange={(e) => setPack(+e.target.value)}
          />
        </div>
        <div>
          <label className="f">Biaya lain</label>
          <input
            type="number"
            value={other}
            onChange={(e) => setOther(+e.target.value)}
          />
        </div>
      </div>

      <div className="calcbox">
        <div className="flex justify-between py-1 text-[13px]">
          <span>Total penjualan</span>
          <span className="num">{rp(saleSub(next))}</span>
        </div>
        <div className="flex justify-between py-1 text-[13px]">
          <span>− Modal barang</span>
          <span className="num">{rp(saleCost(next))}</span>
        </div>
        <div className="flex justify-between py-1 text-[13px]">
          <span>− Biaya operasional</span>
          <span className="num">{rp(saleOps(next))}</span>
        </div>
        <hr className="my-2" />
        <div className="flex justify-between font-bold text-base">
          <span>Laba setelah perubahan</span>
          <span className="num gold">{rp(nextProfit)}</span>
        </div>
        <div className="text-xs mt-2 muted">
          Sebelumnya {rp(curProfit)} · selisih {rp(nextProfit - curProfit)}
        </div>
      </div>

      <div className="text-[11.5px] mt-2" style={{ color: "var(--wa)" }}>
        Perubahan dikirim ke Owner untuk approval — harga, biaya, dan laba baru
        berlaku setelah disetujui.
      </div>

      <div className="flex gap-2 mt-3">
        <button type="button" className="btn s" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="btn s p" onClick={submit}>
          Ajukan perubahan
        </button>
      </div>
    </div>
  );
}
