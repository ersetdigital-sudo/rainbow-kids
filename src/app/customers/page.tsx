import type { Metadata } from "next";
import { CustomersView } from "@/components/modules/customers/CustomersView";

export const metadata: Metadata = {
  title: "Data Toko",
  description:
    "Kelola data toko Anda: nama, no. HP, dan alamat tiap toko.",
  alternates: { canonical: "/customers" },
};

export default function CustomersPage() {
  return <CustomersView />;
}
