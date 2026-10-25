import { DEFAULT_PERMS, seed } from "./seed";
import type { DB, Role } from "./types";

const KEY = "rk_mock_v2";

/**
 * Normalisasi snapshot lama agar tetap terbaca: role "Staff" kini "User",
 * dan role "Approver" yang baru dilengkapi hak akses bawaannya.
 */
function migrate(db: DB): DB {
  const users = db.users.map((u) =>
    (u.role as string) === "Staff" ? { ...u, role: "User" as Role } : u,
  );
  const old = db.perms as unknown as Record<
    string,
    Record<string, string>
  >;
  const perms = {
    Owner: old.Owner ?? DEFAULT_PERMS.Owner,
    Admin: old.Admin ?? DEFAULT_PERMS.Admin,
    Approver: old.Approver ?? DEFAULT_PERMS.Approver,
    User: (old.User ?? old.Staff ?? DEFAULT_PERMS.User) as Record<string, string>,
  } as DB["perms"];
  return { ...db, users, perms };
}

let clientCache: DB | null = null;
let serverCache: DB | null = null;
const listeners = new Set<() => void>();

/** Snapshot untuk SSR & hydration (harus referensial stabil). */
export function getServerSnapshot(): DB {
  if (!serverCache) serverCache = seed();
  return serverCache;
}

/** Snapshot di browser: ambil dari localStorage, fallback ke seed. */
export function getSnapshot(): DB {
  if (clientCache) return clientCache;
  if (typeof window === "undefined") return getServerSnapshot();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DB) : null;
    if (parsed && Array.isArray(parsed.products)) {
      clientCache = migrate(parsed);
    } else {
      // Seed demo langsung disimpan agar konsisten antar reload/sesi.
      clientCache = getServerSnapshot();
      window.localStorage.setItem(KEY, JSON.stringify(clientCache));
    }
  } catch {
    clientCache = getServerSnapshot();
  }
  return clientCache;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSnapshot(next: DB | ((prev: DB) => DB)) {
  const value = typeof next === "function" ? next(getSnapshot()) : next;
  clientCache = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* storage penuh / diblokir — data tetap jalan di memory */
    }
  }
  listeners.forEach((l) => l());
}

export function resetSnapshot() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  clientCache = seed();
  listeners.forEach((l) => l());
}
