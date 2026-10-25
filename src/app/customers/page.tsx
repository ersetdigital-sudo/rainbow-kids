import type { Metadata } from "next";
import { CustomersView } from "@/components/modules/customers/CustomersView";

export const metadata: Metadata = {
  title: "Data Pelanggan",
  description:
    "Kelola data pelanggan Rainbow Kids: no. HP, alamat, dan rekening tujuan transfer yang tampil di invoice.",
  alternates: { canonical: "/customers" },
};

export default function CustomersPage() {
  return <CustomersView />;
}
