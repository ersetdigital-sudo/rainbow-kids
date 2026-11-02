import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Business Suite Manajemen Bisnis Toko",
    template: "%s · Business Suite",
  },
  description:
    "Business suite untuk toko: penjualan, stok, pembelian supplier, stok opname, biaya operasional, piutang, laporan, dan approval harga dalam satu aplikasi.",
  applicationName: "Business Suite",
  keywords: [
    "manajemen toko",
    "kasir toko",
    "stok opname",
    "piutang toko",
    "approval harga",
    "biaya operasional",
  ],
  authors: [{ name: "Business Suite" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Business Suite",
    title: "Business Suite Manajemen Bisnis Toko",
    description:
      "Catat penjualan, kelola stok, dan pantau piutang toko dalam satu dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Business Suite",
    description:
      "Penjualan, stok, piutang, dan approval harga untuk toko.",
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
        <AuthProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
