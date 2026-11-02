import { DEFAULT_PERMS } from "../workspace";
import type { Biz, DB, ModuleKey, Role } from "../types";
import { diffRows, selectAll, upsertRows, type Row } from "./client";

type SettingsRow = {
  id: number;
  name: string;
  addr: string;
  phone: string;
  email: string;
  npwp: string;
  bank: string;
};

type PermRow = { role: string; module: string; level: string };

export type SettingsData = { biz: Biz; perms: DB["perms"] };

/** `initialized` = tabel pengaturan sudah pernah ditulis (toko bukan baru lagi). */
export type Settings = SettingsData & { initialized: boolean };

const SETTINGS_ID = 1;

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

  return { biz, perms, initialized: rows.length > 0 };
}

/**
 * Tandai toko sudah diinisialisasi (dipakai setelah impor data skema lama
 * supaya data yang sudah dikosongkan tidak pernah diimpor ulang).
 */
export async function markInitialized(biz: Biz): Promise<void> {
  await upsertRows("store_settings", bizRows(biz) as unknown as Row[]);
}

function bizRows(biz: Biz): SettingsRow[] {
  return [{ id: SETTINGS_ID, ...biz }];
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
  const biz = diffRows(bizRows(prev.biz), bizRows(next.biz), (r) => String(r.id));
  await upsertRows("store_settings", biz.changed as unknown as Row[]);

  // Daftar role × modul tetap (4 × 9), jadi cukup simpan ulang seluruh baris.
  const perms = permRows(next.perms);
  const before = permRows(prev.perms);
  const changed = perms.some((row) => !before.some((old) => old.role === row.role && old.module === row.module && old.level === row.level));
  if (changed) await upsertRows("role_permissions", perms as unknown as Row[]);
}
