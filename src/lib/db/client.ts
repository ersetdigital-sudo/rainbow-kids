import { getSupabase } from "../supabase";

/** Satu baris tabel Supabase: nama kolom → nilai. */
export type Row = Record<string, unknown>;

const table = (name: string) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  return supabase.from(name);
};

/** Baca seluruh baris satu tabel, urut sesuai kolom `position`. */
export async function selectAll<T>(
  name: string,
  order = "position",
): Promise<T[]> {
  const { data, error } = await table(name)
    .select("*")
    .order(order, { ascending: true });
  if (error) throw new Error(`${name}: ${error.message}`);
  return (data ?? []) as T[];
}

/** Tambah baris baru (tabel log seperti histori stok). */
export async function insertRows(name: string, rows: Row[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await table(name).insert(rows);
  if (error) throw new Error(`${name}: ${error.message}`);
}

/** Simpan baris baru / yang berubah. */
export async function upsertRows(name: string, rows: Row[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await table(name).upsert(rows);
  if (error) throw new Error(`${name}: ${error.message}`);
}

/** Hapus baris berdasarkan satu kolom. */
export async function deleteRows(
  name: string,
  column: string,
  values: (string | number)[],
): Promise<void> {
  if (!values.length) return;
  const { error } = await table(name).delete().in(column, values);
  if (error) throw new Error(`${name}: ${error.message}`);
}

/** Kosongkan tabel log (dipakai saat semua data dikosongkan). */
export async function emptyTable(name: string): Promise<void> {
  const { error } = await table(name).delete().gte("id", 0);
  if (error) throw new Error(`${name}: ${error.message}`);
}

/** Bandingkan dua daftar baris: mana yang berubah dan mana yang hilang. */
export function diffRows<T>(
  prev: T[],
  next: T[],
  key: (row: T) => string,
): { changed: T[]; removed: string[] } {
  const before = new Map(prev.map((row) => [key(row), JSON.stringify(row)]));
  const changed = next.filter((row) => before.get(key(row)) !== JSON.stringify(row));
  const keys = new Set(next.map(key));
  const removed = [...before.keys()].filter((k) => !keys.has(k));
  return { changed, removed };
}

/** Perbandingan nilai apa pun lewat bentuk JSON-nya. */
export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** "2026-11-02" → nilai kolom `date`; string kosong jadi null. */
export function dateValue(value: string | null | undefined): string | null {
  return value && value.length >= 10 ? value.slice(0, 10) : null;
}
