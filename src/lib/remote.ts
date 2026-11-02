import { getSupabase } from "./supabase";
import type { DB } from "./types";

/** Satu baris berisi seluruh state toko. */
const ROW_ID = 1;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: DB | null = null;

/** Dipakai UI untuk memberi tahu bahwa penyimpanan ke Supabase gagal. */
let errorHandler: ((msg: string) => void) | null = null;

export function setRemoteErrorHandler(fn: ((msg: string) => void) | null) {
  errorHandler = fn;
}

function reportError(message: string) {
  console.error("Supabase:", message);
  errorHandler?.(message);
}

/**
 * Hasil baca state toko: `state` null berarti baris belum ada (toko baru),
 * sedangkan `ok: false` berarti baca gagal (tabel belum dibuat / jaringan).
 */
export type RemoteStateResult =
  | { ok: true; state: DB | null }
  | { ok: false };

/** Ambil state toko dari Supabase. */
export async function fetchRemoteState(): Promise<RemoteStateResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    reportError(error.message);
    return { ok: false };
  }

  const state = data?.data as DB | undefined;
  return {
    ok: true,
    state: state && Array.isArray(state.products) ? state : null,
  };
}

/**
 * Simpan state toko ke Supabase. Ditunda sebentar supaya beberapa
 * perubahan berurutan cukup jadi satu penulisan.
 */
export function queueRemoteSave(state: DB) {
  if (!getSupabase()) return;
  pending = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const next = pending;
    pending = null;
    saveTimer = null;
    if (!next) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from("app_state")
      .upsert({ id: ROW_ID, data: next, updated_at: new Date().toISOString() });
    if (error) reportError(error.message);
  }, 500);
}
