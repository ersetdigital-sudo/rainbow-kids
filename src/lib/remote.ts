import { loadStore, saveStore } from "./db";
import { getSupabase } from "./supabase";
import { emptyDb } from "./workspace";
import type { DB } from "./types";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: DB | null = null;
let running = false;
/** State terakhir yang sudah tersimpan — dasar perhitungan selisih. */
let synced: DB | null = null;

/** Dipakai UI untuk memberi tahu bahwa penyimpanan ke Supabase gagal. */
let errorHandler: ((msg: string) => void) | null = null;

export function setRemoteErrorHandler(fn: ((msg: string) => void) | null) {
  errorHandler = fn;
}

function reportError(message: string) {
  console.error("Supabase:", message);
  errorHandler?.(message);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Hasil baca state toko: `state` null berarti masih kosong (toko baru),
 * sedangkan `ok: false` berarti baca gagal (skema belum jalan / jaringan).
 */
export type RemoteStateResult = { ok: true; state: DB | null } | { ok: false };

/** Ambil state toko dari tabel-tabel Supabase. */
export async function fetchRemoteState(): Promise<RemoteStateResult> {
  if (!getSupabase()) return { ok: false };
  try {
    const state = await loadStore();
    synced = state ?? emptyDb();
    return { ok: true, state };
  } catch (error) {
    reportError(message(error));
    return { ok: false };
  }
}

/** Kirim perubahan berikutnya ke Supabase; satu penyimpanan dalam satu waktu. */
async function flush() {
  if (running) return;
  running = true;
  try {
    while (pending) {
      const next = pending;
      pending = null;
      await saveStore(synced ?? emptyDb(), next);
      synced = next;
    }
  } catch (error) {
    reportError(message(error));
  } finally {
    running = false;
  }
}

/**
 * Simpan perubahan state toko ke Supabase. Ditunda sebentar supaya beberapa
 * perubahan berurutan cukup jadi satu penulisan.
 */
export function queueRemoteSave(state: DB) {
  if (!getSupabase()) return;
  pending = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, 500);
}
