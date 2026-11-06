"use client";

import { useStore } from "./store";
import { canApprove } from "./access";

export { activeRole, canApprove } from "./access";

/** Akses halaman Approval & Audit beserta pintu masuknya di navigasi. */
export function useApproverAccess(): { ready: boolean; allowed: boolean } {
  const { db, storeReady } = useStore();
  return { ready: storeReady, allowed: canApprove(db) };
}
