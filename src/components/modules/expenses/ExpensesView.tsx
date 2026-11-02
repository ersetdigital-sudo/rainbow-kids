"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { downloadCsv, stamp } from "@/lib/export";
import { ExpenseDrawer } from "./ExpenseDrawer";
import type { Expense } from "@/lib/types";

type Row = Expense & { index: number };

/** Biaya operasional di luar order, dipakai tab Biaya di Laporan. */
export function ExpensesView() {
  const { db, toast } = useStore();
  const [month, setMonth] = useState("");
  const [edit, setEdit] = useState<number | "new" | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      db.expenses
        .map((e, index) => ({ ...e, index }))
        .filter((e) => !month || e.date.slice(0, 7) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.expenses, month],
  );

  const total = rows.reduce((sum, r) => sum + r.amt, 0);

  const exportCsv = () => {
    if (!rows.length) {
      toast("Belum ada biaya untuk diekspor");
      return;
    }
    downloadCsv(
      `biaya-${stamp()}`,
      ["Tanggal", "Kategori", "Jumlah"],
      rows.map((r) => [r.date, r.cat, r.amt]),
    );
    toast("Biaya diekspor ke CSV");
  };

  const columns: Column<Row>[] = [
    {
      key: "date",
      label: "Tanggal",
      render: (r) => formatDate(r.date),
    },
    { key: "cat", label: "Kategori", render: (r) => r.cat },
    {
      key: "amt",
      label: "Jumlah",
      align: "right",
      render: (r) => <span className="num font-semibold">{rp(r.amt)}</span>,
    },
    {
      key: "action",
      label: "",
      noLabel: true,
      align: "right",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="btn s"
            onClick={(e) => {
              e.stopPropagation();
              setEdit(r.index);
            }}
          >
            Ubah
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Biaya Operasional"
        subtitle="Catat pengeluaran di luar order supaya laba bersih di Laporan akurat."
        actions={
          <>
            <input
              type="month"
              aria-label="Filter bulan"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <button type="button" className="btn" onClick={exportCsv}>
              Ekspor CSV
            </button>
            <button
              type="button"
              className="btn p"
              onClick={() => setEdit("new")}
            >
              + Catat biaya
            </button>
          </>
        }
      />

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div
            className="text-[11px] uppercase tracking-wider"
            style={{ color: "var(--mu)" }}
          >
            Total biaya {month ? "bulan ini" : "tercatat"}
          </div>
          <div className="text-2xl font-bold num mt-1">{rp(total)}</div>
        </div>
        <div className="card p-4">
          <div
            className="text-[11px] uppercase tracking-wider"
            style={{ color: "var(--mu)" }}
          >
            Jumlah catatan
          </div>
          <div className="text-2xl font-bold num mt-1">{rows.length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.index}-${r.date}-${r.cat}`}
        emptyText="Belum ada biaya tercatat"
      />

      <ExpenseDrawer index={edit} onClose={() => setEdit(null)} />
    </>
  );
}
