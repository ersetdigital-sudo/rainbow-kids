"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { MoneyInput } from "@/components/ui/NumericInput";
import { Drawer } from "@/components/ui/Drawer";
import { TODAY } from "@/lib/date";

/**
 * Form catat / ubah biaya operasional toko (listrik, gaji, sewa, …).
 * `index` null = biaya baru.
 */
export function ExpenseDrawer({
  index,
  onClose,
}: {
  index: number | "new" | null;
  onClose: () => void;
}) {
  const { db, addExpense, updateExpense, removeExpense, toast } = useStore();
  const existing = typeof index === "number" ? db.expenses[index] : null;
  const isNew = index === "new";

  const [date, setDate] = useState(existing?.date || TODAY);
  const [cat, setCat] = useState(existing?.cat ?? "");
  const [amt, setAmt] = useState(existing?.amt ?? 0);

  const submit = () => {
    const res = isNew
      ? addExpense({ date, cat, amt })
      : updateExpense(index as number, { date, cat, amt });
    toast(res.msg);
    if (res.ok) onClose();
  };

  const remove = () => {
    const res = removeExpense(index as number);
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={index !== null}
      onClose={onClose}
      title={isNew ? "Catat biaya" : "Ubah biaya"}
      footer={
        <>
          {existing && (
            <button type="button" className="btn d mr-auto" onClick={remove}>
              Hapus
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            Simpan
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="f">Tanggal</label>
          <input
            type="date"
            aria-label="Tanggal biaya"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="f">Jumlah</label>
          <MoneyInput
            aria-label="Jumlah biaya"
            value={amt}
            onChange={setAmt}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="f">Kategori biaya</label>
          <input
            aria-label="Kategori biaya"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="mis. Listrik toko"
          />
        </div>
      </div>

      <div className="text-[11.5px] mt-3" style={{ color: "var(--mu)" }}>
        Biaya di sini adalah pengeluaran di luar order (sewa, gaji, listrik,
        operasional). Ongkir dan packing sudah otomatis dihitung dari transaksi.
      </div>
    </Drawer>
  );
}
