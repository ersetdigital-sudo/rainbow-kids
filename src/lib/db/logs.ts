import type { Expense, HistoryEntry } from "../types";
import {
  dateValue,
  emptyTable,
  insertRows,
  same,
  selectAll,
  type Row,
} from "./client";

type HistoryRow = {
  vid: string;
  date: string | null;
  type: string;
  description: string;
  user_name: string | null;
};

type ExpenseRow = { date: string | null; cat: string; amt: number };

/**
 * Tabel log hanya bertambah. Bila isinya bukan sekadar tambahan di belakang
 * (mis. semua data dikosongkan), tabel ditulis ulang dari awal.
 */
async function saveLog<T>(
  table: string,
  prev: T[],
  next: T[],
  toRow: (row: T) => Row,
): Promise<void> {
  if (same(prev, next)) return;

  const appended =
    next.length >= prev.length && prev.every((row, i) => same(row, next[i]));

  if (!appended) {
    await emptyTable(table);
    await insertRows(table, next.map(toRow));
    return;
  }

  await insertRows(table, next.slice(prev.length).map(toRow));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const rows = await selectAll<HistoryRow>("stock_history", "id");
  return rows.map((r) => ({
    vid: r.vid,
    date: r.date ?? "",
    type: r.type as HistoryEntry["type"],
    desc: r.description,
    user: r.user_name ?? "",
  }));
}

export async function saveHistory(
  prev: HistoryEntry[],
  next: HistoryEntry[],
): Promise<void> {
  await saveLog("stock_history", prev, next, (h) => ({
    vid: h.vid,
    date: dateValue(h.date),
    type: h.type,
    description: h.desc,
    user_name: h.user,
  }));
}

export async function loadExpenses(): Promise<Expense[]> {
  const rows = await selectAll<ExpenseRow>("expenses", "id");
  return rows.map((r) => ({
    date: r.date ?? "",
    cat: r.cat,
    amt: Number(r.amt),
  }));
}

export async function saveExpenses(
  prev: Expense[],
  next: Expense[],
): Promise<void> {
  await saveLog("expenses", prev, next, (e) => ({
    date: dateValue(e.date),
    cat: e.cat,
    amt: e.amt,
  }));
}
