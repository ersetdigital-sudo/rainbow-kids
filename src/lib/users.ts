import { getSupabase } from "./supabase";
import type { AppUser, Role } from "./types";

type Result = { ok: boolean; msg: string };

/** Token sesi Supabase dipakai untuk membuktikan pemanggil sudah masuk. */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = (await getSupabase()?.auth.getSession()) ?? {
    data: { session: null },
  };
  const token = data.session?.access_token ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Daftar pengguna diambil dari akun Supabase Auth — satu-satunya sumber data
 * pengguna. Null bila Supabase belum dikonfigurasi / gagal dibaca.
 */
export async function fetchAccounts(): Promise<AppUser[] | null> {
  if (!getSupabase()) return null;
  try {
    const res = await fetch("/api/users", {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; users?: AppUser[] }
      | null;
    return json?.ok && Array.isArray(json.users) ? json.users : null;
  } catch {
    return null;
  }
}

export type AccountPatch = {
  /** Email akun saat ini — dipakai server untuk menemukan akunnya. */
  email: string;
  name?: string;
  newEmail?: string;
  role?: Role;
  active?: boolean;
};

/** Simpan perubahan pengguna ke akun Supabase Auth. */
export async function patchAccount(patch: AccountPatch): Promise<Result> {
  if (!getSupabase()) return { ok: false, msg: "Supabase belum dikonfigurasi" };
  try {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(patch),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; msg?: string }
      | null;
    return {
      ok: Boolean(json?.ok),
      msg: json?.ok ? "" : json?.msg || "Gagal menyimpan pengguna",
    };
  } catch {
    return { ok: false, msg: "Gagal menghubungi server" };
  }
}

/** Hapus akun login dari Supabase Auth. */
export async function removeAccount(email: string): Promise<Result> {
  if (!getSupabase()) return { ok: false, msg: "Supabase belum dikonfigurasi" };
  try {
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ email }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; msg?: string }
      | null;
    return {
      ok: Boolean(json?.ok),
      msg: json?.ok ? "" : json?.msg || "Gagal menghapus akun",
    };
  } catch {
    return { ok: false, msg: "Gagal menghubungi server" };
  }
}

/** Buat akun login baru (email + password) di Supabase Auth. */
export async function createAccount(input: {
  name: string;
  email: string;
  role: Role;
  password: string;
}): Promise<Result> {
  if (!getSupabase()) return { ok: false, msg: "Supabase belum dikonfigurasi" };
  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; msg?: string }
      | null;
    return {
      ok: Boolean(json?.ok),
      msg: json?.ok ? "" : json?.msg || "Gagal membuat akun",
    };
  } catch {
    return { ok: false, msg: "Gagal menghubungi server" };
  }
}
