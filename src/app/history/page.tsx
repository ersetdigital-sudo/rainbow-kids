import type { Metadata } from "next";
import { HistoryView } from "@/components/modules/history/HistoryView";

export const metadata: Metadata = {
  title: "Histori Pelanggan & Supplier",
  description:
    "Histori belanja tiap pelanggan dan tiap supplier: total bulanan dan tahunan, jumlah transaksi, dan barang yang dibeli.",
  alternates: { canonical: "/history" },
};

export default function HistoryPage() {
  return <HistoryView />;
}
