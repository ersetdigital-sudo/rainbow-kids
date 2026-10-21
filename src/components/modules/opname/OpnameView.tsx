"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { findVariant, opnameDiff } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { OpnameDrawer, OpnameStatusBadge } from "./OpnameDrawer";
import type { Opname } from "@/lib/types";

const STEPS = [
  "1. Mulai sesi",
  "2. Input stok fisik",
  "3. Isi penyebab selisih",
  "4. Owner menyetujui",
];

export function OpnameView() {
  const { db, startOpname, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const columns: Column<Opname>[] = [
    {
      key: "id",
      label: "No.",
      render: (o) => <span className="font-semibold">{o.id}</span>,
    },
    { key: "date", label: "Tanggal", render: (o) => formatDate(o.date) },
    {
      key: "items",
      label: "Item",
      align: "right",
      render: (o) => o.lines.length,
    },
    {
      key: "diff",
      label: "Item selisih",
      align: "right",
      render: (o) => o.lines.filter((l) => l.phys !== "" && l.phys !== l.sys).length,
    },
    {
      key: "value",
      label: "Nilai selisih",
      align: "right",
      render: (o) => {
        const value = o.lines.reduce((a, l) => {
          const v = findVariant(db, l.vid);
          return a + opnameDiff(l) * (v?.cost ?? 0);
        }, 0);
        return (
          <span className="num" style={{ color: value < 0 ? "var(--er)" : "inherit" }}>
            {rp(value)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (o) => <OpnameStatusBadge status={o.status} />,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (o) => (
        <span className="btn s">{o.status === "Draft" ? "Lanjutkan" : "Lihat"}</span>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Stok Opname"
        subtitle="Bandingkan stok sistem dengan hitungan fisik. Penyesuaian baru berlaku setelah disetujui Owner."
        actions={
          <button
            type="button"
            className="btn p"
            onClick={() => {
              const id = startOpname();
              toast("Sesi opname dibuat");
              setOpenId(id);
            }}
          >
            + Mulai opname
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="card p-3 sm:p-4 flex gap-3 items-center"
          >
            <div
              className="w-8 h-8 flex-none rounded-full grid place-items-center font-bold text-sm"
              style={{ background: "var(--acs)", color: "var(--ac2)" }}
            >
              {i + 1}
            </div>
            <div className="text-[13px] font-semibold">{s.slice(3)}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={db.opnames.slice().reverse()}
          rowKey={(o) => o.id}
          onRowClick={(o) => setOpenId(o.id)}
        />
      </div>

      <OpnameDrawer opnameId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
