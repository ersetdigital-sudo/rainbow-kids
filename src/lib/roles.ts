import type { Role } from "./types";

export const ROLES: Role[] = ["Owner", "Admin", "Approver", "User"];

type Metadata = Record<string, unknown> | null | undefined;

/**
 * Role dari `app_metadata` — sumber kebenaran yang hanya bisa ditulis service
 * role. `user_metadata` hanya dipakai sebagai fallback akun lama (nilainya
 * langsung disalin ke `app_metadata` oleh /api/users).
 */
export function roleFromMetadata(
  app?: Metadata,
  legacy?: Metadata,
): Role | null {
  const value = app?.role;
  if (typeof value === "string" && ROLES.includes(value as Role)) {
    return value as Role;
  }
  const old = legacy?.role;
  if (typeof old === "string" && ROLES.includes(old as Role)) {
    return old as Role;
  }
  return null;
}

export type RoleSource = {
  app_metadata?: Metadata;
  user_metadata?: Metadata;
};

/** Role efektif sebuah akun Supabase Auth. */
export function roleOfUser(user: RoleSource): Role {
  return roleFromMetadata(user.app_metadata, user.user_metadata) ?? "User";
}
