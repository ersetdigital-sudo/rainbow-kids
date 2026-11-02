import { getSupabase } from "../supabase";
import type { DB } from "../types";
import { DEFAULT_PREFS, emptyDb } from "../workspace";
import { loadApprovals, saveApprovals } from "./approvals";
import { loadExpenses, loadHistory, saveExpenses, saveHistory } from "./logs";
import { loadOpnames, saveOpnames } from "./opnames";
import {
  loadCustomers,
  loadSuppliers,
  saveCustomers,
  saveSuppliers,
} from "./partners";
import { loadProducts, saveProducts } from "./products";
import { loadPurchases, savePurchases } from "./purchases";
import { loadSales, saveSales } from "./sales";
import { loadSettings, markInitialized, saveSettings } from "./settings";

/**
 * Rakit seluruh state toko dari tabel-tabel relasional di Supabase.
 * `null` berarti workspace masih benar-benar kosong (toko baru).
 */
export async function loadStore(): Promise<DB | null> {
  const [
    products,
    customers,
    suppliers,
    sales,
    purchases,
    approvals,
    opnames,
    history,
    expenses,
    settings,
  ] = await Promise.all([
    loadProducts(),
    loadCustomers(),
    loadSuppliers(),
    loadSales(),
    loadPurchases(),
    loadApprovals(),
    loadOpnames(),
    loadHistory(),
    loadExpenses(),
    loadSettings(),
  ]);

  const blank =
    !settings.initialized &&
    !products.length &&
    !customers.length &&
    !suppliers.length &&
    !sales.length &&
    !purchases.length &&
    !approvals.length &&
    !opnames.length &&
    !history.length &&
    !expenses.length &&
    !settings.biz.name;

  if (blank) {
    // Toko baru: pindahkan isi skema lama (satu baris jsonb) bila masih ada.
    const legacy = await readLegacyState();
    if (legacy) {
      await saveStore(emptyDb(), legacy);
      // Penanda supaya data hasil impor tidak dimunculkan lagi setelah dihapus.
      await markInitialized(legacy.biz, legacy.prefs ?? DEFAULT_PREFS);
      return legacy;
    }
    return null;
  }

  return {
    products,
    customers,
    suppliers,
    sales,
    purchases,
    history,
    approvals,
    opnames,
    expenses,
    // Pengguna berasal dari Supabase Auth, bukan dari tabel data toko.
    users: [],
    perms: settings.perms,
    biz: settings.biz,
    prefs: settings.prefs,
    user: "",
  };
}

/** Simpan perubahan state toko ke tabel masing-masing (hanya yang berubah). */
export async function saveStore(prev: DB, next: DB): Promise<void> {
  await saveSettings(
    { biz: prev.biz, prefs: prev.prefs, perms: prev.perms },
    { biz: next.biz, prefs: next.prefs, perms: next.perms },
  );
  await saveProducts(prev.products, next.products);
  await saveCustomers(prev.customers, next.customers);
  await saveSuppliers(prev.suppliers, next.suppliers);
  await saveSales(prev.sales, next.sales);
  await savePurchases(prev.purchases, next.purchases);
  await saveOpnames(prev.opnames, next.opnames);
  await saveApprovals(prev.approvals, next.approvals);
  await saveHistory(prev.history, next.history);
  await saveExpenses(prev.expenses, next.expenses);
}

/**
 * Skema lama: seluruh toko di satu baris jsonb `app_state`.
 * Dibaca sekali supaya data yang sudah ada tidak hilang setelah pecah tabel.
 */
async function readLegacyState(): Promise<DB | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data?.data) return null;
    const state = data.data as DB;
    if (!Array.isArray(state.products)) return null;
    // Baris lama yang sudah dikosongkan tidak perlu diimpor.
    const hasContent = Boolean(
      state.products.length ||
        state.customers?.length ||
        state.sales?.length ||
        state.purchases?.length ||
        state.opnames?.length ||
        state.approvals?.length ||
        state.history?.length ||
        state.biz?.name,
    );
    return hasContent ? state : null;
  } catch {
    return null;
  }
}
