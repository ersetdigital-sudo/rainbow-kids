"use client";

import { useMemo, useState } from "react";
import { customerStatus } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { CustomerDrawer } from "./CustomerDrawer";
import type { Customer } from "@/lib/types";

const EMPTY = <span style={{ color: "var(--mu)" }}>—</span>;

export function CustomersView() {
  const { db, requestCustomerDelete, toast } = useStore();
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const pendingDeleteIds = useMemo(
    () =>
      new Set(
        db.approvals.flatMap((a) =>
          a.kind === "customerDelete" &&
          a.status === "Menunggu" &&
          a.customerId
            ? [a.customerId]
            : [],
        ),
      ),
    [db.approvals],
  );

  const deleteTarget = deleteId
    ? db.customers.find((c) => c.id === deleteId) ?? null
    : null;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.customers.filter(
      (c) =>
        (showArchived || customerStatus(c) !== "Diarsipkan") &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q)),
    );
  }, [db.customers, query, showArchived]);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Toko",
      render: (c) => {
        const status = customerStatus(c);
        return (
          <div>
            <div className="font-semibold">{c.name}</div>
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
              {pendingDeleteIds.has(c.id) && (
                <span className="bd b-er">Menunggu hapus</span>
              )}
            </div>
          </div>
        );
      },
    },
    { key: "phone", label: "No. HP", render: (c) => c.phone || EMPTY },
    {
      key: "address",
      label: "Alamat",
      cellClass: "h-wrap",
      render: (c) => c.address || EMPTY,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (c) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="btn s"
            onClick={(e) => {
              e.stopPropagation();
              setEditId(c.id);
            }}
          >
            Ubah
          </button>
          <button
            type="button"
            className="btn s d"
            disabled={pendingDeleteIds.has(c.id)}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(c.id);
            }}
          >
            Ajukan hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Data Toko"
        subtitle="Simpan no. HP dan alamat tiap toko. Rekening tujuan transfer invoice diatur di Pengaturan Toko."
        actions={
          <button
            type="button"
            className="btn p"
            onClick={() => setEditId("new")}
          >
            + Toko baru
          </button>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 p-4">
          <input
            className="max-w-xs"
            placeholder="Cari nama / HP / alamat / rekening"
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
        </div>
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(c) => c.id}
          onRowClick={(c) => setEditId(c.id)}
          emptyText="Tidak ada toko yang cocok"
        />
      </div>

      <CustomerDrawer
        key={`customer-${editId ?? "none"}`}
        customerId={editId}
        onClose={() => setEditId(null)}
      />

      <ReasonDialog
        key={`delete-customer-${deleteId ?? "none"}`}
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Ajukan hapus toko"
        description={
          deleteTarget
            ? `Pengajuan hapus untuk ${deleteTarget.name} akan diperiksa Owner. Toko tanpa transaksi akan dihapus permanen; toko yang punya transaksi akan diarsipkan.`
            : "Pengajuan hapus akan diperiksa Owner."
        }
        placeholder="Contoh: toko sudah tidak aktif / pindah domisili"
        onConfirm={(reason) => {
          if (!deleteId)
            return { ok: false, msg: "Pilih toko terlebih dulu" };
          const res = requestCustomerDelete(deleteId, reason);
          toast(res.msg);
          if (res.ok) setDeleteId(null);
          return res;
        }}
      />
    </>
  );
}
