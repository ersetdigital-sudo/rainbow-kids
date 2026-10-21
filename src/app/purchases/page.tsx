import type { Metadata } from "next";
import { PurchasesView } from "@/components/modules/purchases/PurchasesView";

export const metadata: Metadata = {
  title: "Pembelian Supplier",
  description:
    "Catat pembelian dari nota supplier, stok bertambah otomatis, dan rekap belanja per supplier.",
  alternates: { canonical: "/purchases" },
};

export default function PurchasesPage() {
  return <PurchasesView />;
}
