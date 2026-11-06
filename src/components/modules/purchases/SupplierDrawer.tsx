"use client";

import { useState } from "react";
import { supplierStatus } from "@/lib/calc";
import { canWriteSupplier } from "@/lib/access";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";

/**
 * Form tambah / ubah data supplier. Owner/Approver langsung tersimpan,
 * User/Admin mengirim pengajuan yang baru berlaku setelah disetujui.
 */
export function SupplierDrawer({
  supplierId,
  onClose,
}: {
  /** ID supplier yang diubah, atau "new" untuk supplier baru. */
  supplierId: string | null;
  onClose: () => void;
}) {
  const { db, addSupplier, requestSupplierEdit, toast } = useStore();
  const isNew = supplierId === "new";
  const existing =
    supplierId && !isNew
      ? db.suppliers.find((s) => s.id === supplierId) ?? null
      : null;
  const direct = canWriteSupplier(db);

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");

  const pendingEdit = Boolean(
    existing &&
      db.approvals.some(
        (a) =>
          a.kind === "supplierEdit" &&
          a.supplierId === existing.id &&
          a.status === "Menunggu",
      ),
  );

  const submit = () => {
    const res = isNew
      ? addSupplier({ name, phone, address })
      : requestSupplierEdit(supplierId!, { name, phone, address });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={Boolean(supplierId)}
      onClose={onClose}
      title={isNew ? "Tambah supplier" : "Ubah data supplier"}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn p"
            disabled={pendingEdit}
            onClick={submit}
          >
            {isNew
              ? direct
                ? "Simpan"
                : "Ajukan supplier"
              : direct
                ? "Simpan perubahan"
                : "Ajukan perubahan"}
          </button>
        </>
      }
    >
      {existing && (
        <div className="sim mb-3">
          Status: <b>{supplierStatus(existing)}</b>
          {supplierStatus(existing) === "Diarsipkan" &&
            " — tidak bisa dipilih di nota pembelian baru."}
        </div>
      )}
      {pendingEdit && (
        <div className="sim mb-3">
          Perubahan supplier ini sedang menunggu persetujuan Owner/Approver.
          Data lama tetap dipakai sampai pengajuan diputuskan.
        </div>
      )}
      {!direct && (
        <div className="sim mb-3">
          Pengajuan akan diperiksa Owner atau Approver. Data supplier baru
          berlaku setelah disetujui.
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="f">Nama supplier</label>
          <input
            aria-label="Nama supplier"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="f">No. HP (opsional)</label>
          <input
            aria-label="No. HP supplier"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812-xxxx-xxxx"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="f">Alamat (opsional)</label>
          <input
            aria-label="Alamat supplier"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Jl. ..."
          />
        </div>
      </div>
    </Drawer>
  );
}
