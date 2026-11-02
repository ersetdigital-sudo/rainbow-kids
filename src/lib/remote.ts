import { getSupabase } from "./supabase";
import type { DB } from "./types";

/** Satu baris berisi seluruh state toko. */
const ROW_ID = 1;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: DB | null = null;

/** Ambil state toko dari Supabase. Null bila belum ada atau gagal. */
export async function fetchRemoteState(): Promise<DB | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    console.error("Gagal memuat data Supabase:", error.message);
    return null;
  }

  const state = data?.data as DB | undefined;
  return state && Array.isArray(state.products) ? state : null;
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
    if (error) console.error("Gagal menyimpan ke Supabase:", error.message);
  }, 500);
}
