import { ROLES } from "./roles";
import type { DB, Role } from "./types";

/** Role pengguna aktif dari penanda `db.user` ("Nama (Role)"). */
export function activeRole(db: DB): Role | null {
  const raw = db.user.trim();
  if (!raw) return null;

  const known = db.users.find(
    (u) =>
      `${u.name} (${u.role})` === raw ||
      u.email.trim().toLowerCase() === raw.toLowerCase(),
  );
  if (known) return known.role;

  const suffix = raw.match(/\(([^)]+)\)\s*$/);
  if (suffix && ROLES.includes(suffix[1] as Role)) return suffix[1] as Role;
  return null;
}

/**
 * Apakah role aktif berhak menyetujui (level "Setujui" pada modul approval).
 * Tanpa akun aktif (mode lokal) menu tetap tampil supaya fitur tidak hilang.
 */
export function canApprove(db: DB): boolean {
  const role = activeRole(db);
  if (!role) return true;
  return db.perms[role]?.approval === "Setujui";
}

/** Owner/Approver boleh menulis data master (supplier) langsung. */
export function canWriteSupplier(db: DB): boolean {
  const role = activeRole(db);
  if (!role) return true;
  return role === "Owner" || role === "Approver";
}
