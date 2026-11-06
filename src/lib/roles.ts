import type { Role } from "./types";

export const ROLES: Role[] = ["Owner", "Admin", "Approver", "User"];

type Metadata = Record<string, unknown> | null | undefined;

/**
 * Role dari `app_metadata` — satu-satunya sumber kebenaran. `user_metadata`
 * tidak dipakai lagi karena pemilik akun bisa mengubahnya sendiri.
 */
export function roleFromMetadata(app?: Metadata): Role | null {
  const value = app?.role;
  if (typeof value === "string" && ROLES.includes(value as Role)) {
    return value as Role;
  }
  return null;
}

export type RoleSource = {
  app_metadata?: Metadata;
};

/**
 * Role efektif sebuah akun Supabase Auth. Akun tanpa role di `app_metadata`
 * dianggap role paling rendah (User).
 */
export function roleOfUser(user: RoleSource): Role {
  return roleFromMetadata(user.app_metadata) ?? "User";
}
