import type { Metadata } from "next";
import { SalesView } from "@/components/modules/sales/SalesView";

export const metadata: Metadata = {
  title: "Penjualan",
  description:
    "Catat transaksi tunai dan tempo lengkap dengan modal, biaya operasional, dan laba per order untuk toko Rainbow Kids.",
  alternates: { canonical: "/sales" },
};

export default function SalesPage() {
  return <SalesView />;
}
