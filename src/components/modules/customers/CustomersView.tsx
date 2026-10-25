"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { CustomerDrawer } from "./CustomerDrawer";
import type { Customer } from "@/lib/types";

const EMPTY = <span style={{ color: "var(--mu)" }}>—</span>;

export function CustomersView() {
  const { db } = useStore();
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        (c.bank ?? "").toLowerCase().includes(q),
    );
  }, [db.customers, query]);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Pelanggan",
      render: (c) => (
        <div>
          <div className="font-semibold">{c.name}</div>
          <div className="text-[11px]" style={{ color: "var(--mu)" }}>
            {c.type}
          </div>
        </div>
      ),
    },
    { key: "phone", label: "No. HP", render: (c) => c.phone || EMPTY },
    {
      key: "address",
      label: "Alamat",
      cellClass: "h-wrap",
      render: (c) => c.address || EMPTY,
    },
    {
      key: "bank",
      label: "Tujuan transfer",
      cellClass: "h-wrap",
      render: (c) => c.bank || EMPTY,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (c) => (
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
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Data Pelanggan"
        subtitle="Simpan no. HP, alamat, dan rekening tujuan transfer tiap pelanggan — rekening ini yang tampil di invoice."
        actions={
          <button
            type="button"
            className="btn p"
            onClick={() => setEditId("new")}
          >
            + Pelanggan baru
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
        </div>
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(c) => c.id}
          onRowClick={(c) => setEditId(c.id)}
          emptyText="Tidak ada pelanggan yang cocok"
        />
      </div>

      <CustomerDrawer
        key={`customer-${editId ?? "none"}`}
        customerId={editId}
        onClose={() => setEditId(null)}
      />
    </>
  );
}
