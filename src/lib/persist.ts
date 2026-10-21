import { seed } from "./seed";
import type { DB } from "./types";

const KEY = "rk_mock_v2";

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
      clientCache = parsed;
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
