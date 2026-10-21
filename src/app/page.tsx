import type { Metadata } from "next";
import { DashboardView } from "@/components/modules/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Ringkasan usaha Rainbow Kids: omzet harian & bulanan, estimasi laba, piutang aktif, transaksi terbaru, dan stok yang menipis.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Rainbow Kids",
  description:
    "Toko perlengkapan anak dengan business suite untuk penjualan, stok, pembelian, piutang, dan approval harga.",
  url: "https://rainbowkids.id",
  telephone: "0812-2233-4455",
  email: "halo@rainbowkids.id",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Pelangi Raya No. 8",
    addressLocality: "Bandung",
    postalCode: "40115",
    addressCountry: "ID",
  },
  taxID: "01.234.567.8-423.000",
  currenciesAccepted: "IDR",
  paymentAccepted: "Tunai, Transfer, QRIS",
  areaServed: "Bandung",
  openingHours: "Mo-Su 09:00-21:00",
};

export default function DashboardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <DashboardView />
    </>
  );
}
