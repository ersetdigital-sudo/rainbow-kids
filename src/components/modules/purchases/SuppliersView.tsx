"use client";

import { useMemo, useState } from "react";
import { supplierStatus } from "@/lib/calc";
import { canWriteSupplier } from "@/lib/access";
import { useStore } from "@/lib/store";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { SupplierDrawer } from "./SupplierDrawer";
import type { Supplier } from "@/lib/types";

const EMPTY = <span style={{ color: "var(--mu)" }}>—</span>;

type SupplierRow = Supplier & { pendingNew?: boolean };

export function SuppliersView({
  newOpen,
  onNewClose,
}: {
  newOpen: boolean;
  onNewClose: () => void;
}) {
  const { db, requestSupplierDelete, toast } = useStore();
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const direct = canWriteSupplier(db);

  const pendingNew = useMemo(
    () =>
      db.approvals.filter(
        (a) => a.kind === "supplier" && a.status === "Menunggu",
      ),
    [db.approvals],
  );

  const pendingEditIds = useMemo(
    () =>
      new Set(
        db.approvals.flatMap((a) =>
          a.kind === "supplierEdit" &&
          a.status === "Menunggu" &&
          a.supplierId
            ? [a.supplierId]
            : [],
        ),
      ),
    [db.approvals],
  );

  const pendingDeleteIds = useMemo(
    () =>
      new Set(
        db.approvals.flatMap((a) =>
          a.kind === "supplierDelete" &&
          a.status === "Menunggu" &&
          a.supplierId
            ? [a.supplierId]
            : [],
        ),
      ),
    [db.approvals],
  );

  const list = useMemo<SupplierRow[]>(() => {
    const q = query.trim().toLowerCase();
    const proposals: SupplierRow[] = pendingNew.map((a) => ({
      id: a.supplierId ?? `pending-${a.id}`,
      name: a.supplierRequest?.name ?? a.supplierName ?? "-",
      phone: a.supplierRequest?.phone,
      address: a.supplierRequest?.address,
      status: "Menunggu",
      pendingNew: true,
    }));
    const stored: SupplierRow[] = db.suppliers.filter(
      (s) => showArchived || supplierStatus(s) !== "Diarsipkan",
    );
    return [...proposals, ...stored].filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q),
    );
  }, [pendingNew, db.suppliers, query, showArchived]);

  const columns: Column<SupplierRow>[] = [
    {
      key: "name",
      label: "Supplier",
      render: (s) => {
        const status = supplierStatus(s);
        return (
          <div>
            <div className="font-semibold">{s.name}</div>
            <div
              className="text-[11px] flex items-center gap-1.5 flex-wrap mt-0.5"
              style={{ color: "var(--mu)" }}
            >
              {status === "Menunggu" && (
                <span className="bd b-wa">Menunggu approval</span>
              )}
              {status === "Diarsipkan" && (
                <span className="bd b-in">Diarsipkan</span>
              )}
              {pendingEditIds.has(s.id) && (
                <span className="bd b-wa">Menunggu persetujuan edit</span>
              )}
              {pendingDeleteIds.has(s.id) && (
                <span className="bd b-er">Menunggu hapus</span>
              )}
            </div>
          </div>
        );
      },
    },
    { key: "phone", label: "No. HP", render: (s) => s.phone || EMPTY },
    {
      key: "address",
      label: "Alamat",
      cellClass: "h-wrap",
      render: (s) => s.address || EMPTY,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (s) =>
        s.pendingNew ? (
          <span className="text-[11.5px]" style={{ color: "var(--mu)" }}>
            Menunggu keputusan
          </span>
        ) : (
          <div className="flex gap-1 justify-end">
            <button
              type="button"
              className="btn s"
              disabled={pendingEditIds.has(s.id)}
              onClick={(e) => {
                e.stopPropagation();
                setEditId(s.id);
              }}
            >
              Ubah
            </button>
            <button
              type="button"
              className="btn s d"
              disabled={pendingDeleteIds.has(s.id)}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(s);
              }}
            >
              {pendingDeleteIds.has(s.id)
                ? "Menunggu hapus"
                : direct
                  ? "Hapus"
                  : "Ajukan hapus"}
            </button>
          </div>
        ),
    },
  ];

  return (
    <>
      <div className="card">
        <div className="flex flex-wrap gap-2 p-4">
          <input
            className="max-w-xs"
            placeholder="Cari nama / HP / alamat supplier"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={`btn s${showArchived ? " p" : ""}`}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Sembunyikan arsip" : "Tampilkan arsip"}
          </button>
          <span className="text-[11.5px] self-center" style={{ color: "var(--mu)" }}>
            {direct
              ? "Perubahan langsung tersimpan."
              : "Tambah, ubah, dan hapus supplier diajukan ke Owner/Approver."}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(s) => s.id}
          onRowClick={(s) => {
            if (!s.pendingNew) setEditId(s.id);
          }}
          emptyText="Tidak ada supplier yang cocok"
        />
      </div>

      <SupplierDrawer
        key={`supplier-new-${newOpen ? "open" : "closed"}`}
        supplierId={newOpen ? "new" : null}
        onClose={onNewClose}
      />
      <SupplierDrawer
        key={`supplier-edit-${editId ?? "none"}`}
        supplierId={editId}
        onClose={() => setEditId(null)}
      />

      {direct ? (
        <ConfirmDialog
          key={`delete-supplier-${deleteTarget?.id ?? "none"}`}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Hapus supplier"
          description={
            deleteTarget
              ? `Supplier ${deleteTarget.name} akan dihapus. Supplier yang sudah dipakai di nota pembelian hanya diarsipkan supaya riwayat tetap utuh.`
              : undefined
          }
          confirmLabel="Hapus"
          danger
          onConfirm={() => {
            if (!deleteTarget) return;
            const res = requestSupplierDelete(deleteTarget.id, "");
            toast(res.msg);
          }}
        />
      ) : (
        <ReasonDialog
          key={`delete-supplier-reason-${deleteTarget?.id ?? "none"}`}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Ajukan hapus supplier"
          description={
            deleteTarget
              ? `Pengajuan hapus untuk ${deleteTarget.name} akan diperiksa Owner/Approver. Supplier yang sudah dipakai di pembelian akan diarsipkan, bukan dihapus permanen.`
              : "Pengajuan hapus akan diperiksa Owner/Approver."
          }
          placeholder="Contoh: supplier sudah tidak dipakai"
          onConfirm={(reason) => {
            if (!deleteTarget)
              return { ok: false, msg: "Pilih supplier terlebih dulu" };
            const res = requestSupplierDelete(deleteTarget.id, reason);
            toast(res.msg);
            return res;
          }}
        />
      )}
    </>
  );
}
