import type { Metadata } from "next";
import { ReportsView } from "@/components/modules/reports/ReportsView";

export const metadata: Metadata = {
  title: "Laporan",
  description:
    "Laporan omzet, laba per order, pengeluaran, pembelian supplier, nilai stok, dan piutang per toko.",
  alternates: { canonical: "/reports" },
};

export default function ReportsPage() {
  return <ReportsView />;
}
