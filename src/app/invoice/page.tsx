import type { Metadata } from "next";
import { InvoiceView } from "@/components/modules/invoice/InvoiceView";

export const metadata: Metadata = {
  title: "Invoice",
  description:
    "Template invoice A4 untuk toko Rainbow Kids: rincian barang, total, pembayaran, dan sisa tagihan.",
  alternates: { canonical: "/invoice" },
};

export default function InvoicePage() {
  return <InvoiceView />;
}
