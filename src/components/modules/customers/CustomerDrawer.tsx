"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import type { CustomerType } from "@/lib/types";

/**
 * Form tambah / ubah data pelanggan — termasuk alamat dan rekening
 * tujuan transfer yang dipakai di invoice pelanggan tersebut.
 */
export function CustomerDrawer({
  customerId,
  onClose,
}: {
  /** ID pelanggan yang diubah, atau "new" untuk pelanggan baru. */
  customerId: string | null;
  onClose: () => void;
}) {
  const { db, addCustomer, updateCustomer, toast } = useStore();
  const isNew = customerId === "new";
  const existing =
    customerId && !isNew
      ? db.customers.find((c) => c.id === customerId) ?? null
      : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<CustomerType>(existing?.type ?? "Toko");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [bank, setBank] = useState(existing?.bank ?? "");

  const submit = () => {
    const res = isNew
      ? addCustomer({ name, type, phone, address, bank })
      : updateCustomer(customerId!, { name, type, phone, address, bank });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={Boolean(customerId)}
      onClose={onClose}
      title={isNew ? "Tambah pelanggan" : "Ubah data pelanggan"}
      footer={
        <>
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
          <label className="f">Nama pelanggan</label>
          <input
            aria-label="Nama pelanggan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="f">Jenis</label>
          <select
            aria-label="Jenis pelanggan"
            value={type}
            onChange={(e) => setType(e.target.value as CustomerType)}
          >
            <option value="Toko">Toko</option>
            <option value="Reseller">Reseller</option>
            <option value="Ritel">Ritel</option>
          </select>
        </div>
        <div>
          <label className="f">No. HP (opsional)</label>
          <input
            aria-label="No. HP"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812-xxxx-xxxx"
          />
        </div>
        <div>
          <label className="f">Tujuan transfer (opsional)</label>
          <input
            aria-label="Tujuan transfer"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="mis. BCA 1234567890 a.n. Toko"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="f">Alamat (opsional)</label>
          <input
            aria-label="Alamat"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Jl. ..."
          />
        </div>
      </div>

      <div className="text-[11.5px] mt-3" style={{ color: "var(--wa)" }}>
        Rekening tujuan transfer ini yang dicetak di invoice pelanggan. Kosongkan
        untuk memakai rekening utama toko.
      </div>
    </Drawer>
  );
}
