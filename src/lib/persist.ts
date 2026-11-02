import { queueRemoteSave } from "./remote";
import { DEFAULT_PERMS, emptyDb, seed } from "./seed";
import type { DB, Role } from "./types";

const KEY = "rk_data_v3";

/** Snapshot dari versi demo lama — dibuang supaya data contoh tidak muncul lagi. */
const LEGACY_KEYS = ["rk_mock_v2"];

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
let browserReady = false;
const listeners = new Set<() => void>();

/** Snapshot untuk SSR & hydration (harus referensial stabil). */
export function getServerSnapshot(): DB {
  if (!serverCache) serverCache = emptyDb();
  return serverCache;
}

/**
 * Snapshot di browser: ambil dari localStorage, fallback ke ruang kerja kosong.
 *
 * Selama hydration belum selesai, tetap pakai snapshot server supaya markup
 * server & client identik. Data tersimpan baru dipakai lewat
 * `activateBrowserSnapshot` agar tidak memicu hydration mismatch.
 */
export function getSnapshot(): DB {
  if (typeof window === "undefined") return getServerSnapshot();
  if (!browserReady) return getServerSnapshot();
  if (clientCache) return clientCache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DB) : null;
    if (parsed && Array.isArray(parsed.products)) {
      clientCache = migrate(parsed);
    } else {
      // Kondisi awal: ruang kerja kosong, bukan data contoh.
      clientCache = getServerSnapshot();
      window.localStorage.setItem(KEY, JSON.stringify(clientCache));
    }
  } catch {
    clientCache = getServerSnapshot();
  }
  return clientCache;
}

/**
 * Mulai pakai snapshot browser (localStorage). Dipanggil setelah hydration
 * selesai, lalu listener diberi tahu agar UI memakai data tersimpan.
 */
export function activateBrowserSnapshot() {
  if (typeof window === "undefined" || browserReady) return;
  browserReady = true;
  try {
    LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  getSnapshot();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function persist(value: DB) {
  clientCache = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* storage penuh / diblokir — data tetap jalan di memory */
    }
    // localStorage jadi cache; sumber data bersama ada di Supabase (bila aktif).
    queueRemoteSave(value);
  }
  listeners.forEach((l) => l());
}

export function setSnapshot(next: DB | ((prev: DB) => DB)) {
  const value = typeof next === "function" ? next(getSnapshot()) : next;
  persist(value);
}

/** Hapus semua data dan mulai dari nol (siap diisi data asli). */
export function clearSnapshot() {
  persist(emptyDb());
}

/** Isi kembali data contoh untuk mencoba fitur. */
export function loadDemoSnapshot() {
  persist(seed());
}
