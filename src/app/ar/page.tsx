import type { Metadata } from "next";
import { ReceivablesView } from "@/components/modules/receivables/ReceivablesView";

export const metadata: Metadata = {
  title: "Piutang & Pembayaran",
  description:
    "Pantau tagihan tempo pelanggan, status jatuh tempo, dan catat pembayaran sebagian untuk_piutang toko.",
  alternates: { canonical: "/ar" },
};

export default function ReceivablesPage() {
  return <ReceivablesView />;
}
