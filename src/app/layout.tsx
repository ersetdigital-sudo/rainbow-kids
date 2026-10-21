import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { StoreProvider } from "@/lib/store";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rainbowkids.id";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rainbow Kids · Business Suite Manajemen Bisnis Toko Anak",
    template: "%s · Rainbow Kids",
  },
  description:
    "Rainbow Kids adalah business suite untuk toko anak: penjualan, stok, pembelian supplier, stok opname, piutang, laporan, dan approval harga dalam satu aplikasi.",
  applicationName: "Rainbow Kids Business Suite",
  keywords: [
    "manajemen toko anak",
    "kasir toko anak",
    "stok opname",
    "piutang pelanggan",
    "approval harga",
    "Rainbow Kids",
  ],
  authors: [{ name: "Rainbow Kids" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Rainbow Kids",
    title: "Rainbow Kids · Business Suite Manajemen Bisnis Toko Anak",
    description:
      "Catat penjualan, kelola stok, dan pantau piutang toko anak dalam satu dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rainbow Kids · Business Suite",
    description:
      "Penjualan, stok, piutang, dan approval harga untuk toko anak.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04123F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
