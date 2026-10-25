import type { Metadata } from "next";
import { StoreSettingsView } from "@/components/modules/settings/StoreSettingsView";

export const metadata: Metadata = {
  title: "Pengaturan Toko",
  description:
    "Atur nama, alamat, kontak, NPWP, dan rekening utama Rainbow Kids yang tercetak di kepala invoice.",
  alternates: { canonical: "/settings" },
};

export default function SettingsPage() {
  return <StoreSettingsView />;
}
