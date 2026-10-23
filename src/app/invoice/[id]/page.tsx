import { Suspense } from "react";
import type { Metadata } from "next";
import { InvoiceView } from "@/components/modules/invoice/InvoiceView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Invoice ${id}`,
    description: `Invoice penjualan ${id} dari Rainbow Kids, lengkap dengan rincian barang dan status pembayaran.`,
    alternates: { canonical: `/invoice/${id}` },
    openGraph: {
      title: `Invoice ${id} · Rainbow Kids`,
      description: "Rincian invoice penjualan Rainbow Kids.",
    },
  };
}

/** Membaca `params` di dalam Suspense agar App Shell tetap URL-independent. */
async function InvoiceDetail({ params }: Props) {
  const { id } = await params;
  return <InvoiceView invoiceId={id} />;
}

export default function InvoiceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-sm">Memuat invoice…</p>}>
      <InvoiceDetail params={params} />
    </Suspense>
  );
}
