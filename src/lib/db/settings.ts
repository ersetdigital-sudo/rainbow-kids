import { DEFAULT_PERMS, DEFAULT_PREFS } from "../workspace";
import type { Biz, DB, ModuleKey, Prefs, Role } from "../types";
import { diffRows, selectAll, upsertRows, type Row } from "./client";

type SettingsRow = {
  id: number;
  name: string;
  addr: string;
  phone: string;
  email: string;
  npwp: string;
  bank: string;
  /** Kolom tambahan (migrasi 002) — belum ada di database lama. */
  logo?: string | null;
  note?: string | null;
  due_days?: number | null;
  min_stock?: number | null;
  pay_methods?: string | null;
};

type PermRow = { role: string; module: string; level: string };

export type SettingsData = { biz: Biz; prefs: Prefs; perms: DB["perms"] };

/** `initialized` = tabel pengaturan sudah pernah ditulis (toko bukan baru lagi). */
export type Settings = SettingsData & { initialized: boolean };

const SETTINGS_ID = 1;

/** Pemisah daftar metode pembayaran di satu kolom teks. */
const METHOD_SEP = "|";

function num(value: number | null | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function prefsFromRow(row: SettingsRow | undefined): Prefs {
  const methods = (row?.pay_methods ?? "")
    .split(METHOD_SEP)
    .map((m) => m.trim())
    .filter(Boolean);
  return {
    logo: row?.logo ?? DEFAULT_PREFS.logo,
    note: row?.note ?? DEFAULT_PREFS.note,
    dueDays: num(row?.due_days, DEFAULT_PREFS.dueDays),
    minStock: num(row?.min_stock, DEFAULT_PREFS.minStock),
    methods: methods.length ? methods : DEFAULT_PREFS.methods,
  };
}

export async function loadSettings(): Promise<Settings> {
  const [rows, permRows] = await Promise.all([
    selectAll<SettingsRow>("store_settings", "id"),
    selectAll<PermRow>("role_permissions", "role"),
  ]);

  const row = rows[0];
  const biz: Biz = {
    name: row?.name ?? "",
    addr: row?.addr ?? "",
    phone: row?.phone ?? "",
    email: row?.email ?? "",
    npwp: row?.npwp ?? "",
    bank: row?.bank ?? "",
  };

  // Mulai dari hak akses bawaan, lalu timpa dengan yang tersimpan.
  const perms = Object.fromEntries(
    Object.entries(DEFAULT_PERMS).map(([role, modules]) => [role, { ...modules }]),
  ) as DB["perms"];
  for (const p of permRows) {
    const role = perms[p.role as Role];
    if (role) role[p.module as ModuleKey] = p.level as never;
  }

  return {
    biz,
    prefs: prefsFromRow(row),
    perms,
    initialized: rows.length > 0,
  };
}

/**
 * Tandai toko sudah diinisialisasi (dipakai setelah impor data skema lama
 * supaya data yang sudah dikosongkan tidak pernah diimpor ulang).
 */
export async function markInitialized(
  biz: Biz,
  prefs: Prefs = DEFAULT_PREFS,
): Promise<void> {
  await writeRow(settingsRow(biz, prefs));
}

function settingsRow(biz: Biz, prefs: Prefs): SettingsRow {
  return {
    id: SETTINGS_ID,
    ...biz,
    logo: prefs.logo,
    note: prefs.note,
    due_days: prefs.dueDays,
    min_stock: prefs.minStock,
    pay_methods: prefs.methods.join(METHOD_SEP),
  };
}

/** Supabase menolak insert kolom yang tidak dikenal (skema belum dimigrasi). */
function missingColumn(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

/**
 * Tulis baris pengaturan. Bila kolom pengaturan tambahan belum ada di database
 * (migrasi belum dijalankan), simpan bagian identitas toko saja supaya
 * penyimpanan data toko lainnya tidak ikut gagal.
 */
async function writeRow(row: SettingsRow): Promise<void> {
  try {
    await upsertRows("store_settings", [row] as unknown as Row[]);
  } catch (error) {
    if (!missingColumn(error)) throw error;
    const base: SettingsRow = {
      id: row.id,
      name: row.name,
      addr: row.addr,
      phone: row.phone,
      email: row.email,
      npwp: row.npwp,
      bank: row.bank,
    };
    await upsertRows("store_settings", [base] as unknown as Row[]);
    console.warn(
      "store_settings: kolom logo/note/due_days/min_stock/pay_methods belum ada — jalankan supabase/migration-002-settings.sql",
    );
  }
}

function permRows(perms: DB["perms"]): PermRow[] {
  return Object.entries(perms).flatMap(([role, modules]) =>
    Object.entries(modules).map(([module, level]) => ({
      role,
      module,
      level: String(level),
    })),
  );
}

export async function saveSettings(
  prev: SettingsData,
  next: SettingsData,
): Promise<void> {
  const biz = diffRows(
    [settingsRow(prev.biz, prev.prefs)],
    [settingsRow(next.biz, next.prefs)],
    (r) => String(r.id),
  );
  if (biz.changed.length) await writeRow(biz.changed[0]);

  // Daftar role × modul tetap, jadi cukup simpan ulang seluruh baris.
  const perms = permRows(next.perms);
  const before = permRows(prev.perms);
  const changed = perms.some((row) => !before.some((old) => old.role === row.role && old.module === row.module && old.level === row.level));
  if (changed) await upsertRows("role_permissions", perms as unknown as Row[]);
}
