import type { Metadata } from "next";
import { UsersView } from "@/components/modules/users/UsersView";

export const metadata: Metadata = {
  title: "Pengguna & Hak Akses",
  description:
    "Atur role pengguna dan matriks hak akses modul: dashboard, penjualan, stok, pembelian, opname, piutang, laporan, dan approval.",
  alternates: { canonical: "/users" },
};

export default function UsersPage() {
  return <UsersView />;
}
