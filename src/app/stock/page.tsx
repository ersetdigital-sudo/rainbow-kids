import type { Metadata } from "next";
import { StockView } from "@/components/modules/stock/StockView";

export const metadata: Metadata = {
  title: "Produk & Stok",
  description:
    "Kelola produk, varian, harga modal dan harga jual. Perubahan harga harus melewati approval Owner.",
  alternates: { canonical: "/stock" },
};

export default function StockPage() {
  return <StockView />;
}
