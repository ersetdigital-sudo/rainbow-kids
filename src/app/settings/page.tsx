import type { Metadata } from "next";
import { StoreSettingsView } from "@/components/modules/settings/StoreSettingsView";

export const metadata: Metadata = {
  title: "Pengaturan Toko",
  description:
    "Atur nama, alamat, kontak, NPWP (opsional), rekening utama, logo, dan catatan invoice yang tercetak di dokumen toko.",
  alternates: { canonical: "/settings" },
};

export default function SettingsPage() {
  return <StoreSettingsView />;
}
