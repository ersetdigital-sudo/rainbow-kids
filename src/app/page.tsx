import type { Metadata } from "next";
import { DashboardView } from "@/components/modules/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Ringkasan usaha toko: omzet harian & bulanan, estimasi laba, piutang aktif, transaksi terbaru, dan stok yang menipis.",
  alternates: { canonical: "/" },
};

export default function DashboardPage() {
  return <DashboardView />;
}
