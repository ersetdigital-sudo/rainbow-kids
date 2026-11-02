import type { Metadata } from "next";
import { ExpensesView } from "@/components/modules/expenses/ExpensesView";

export const metadata: Metadata = {
  title: "Biaya Operasional",
  description:
    "Catat biaya operasional toko di luar order (sewa, gaji, listrik) supaya laba bersih akurat.",
  alternates: { canonical: "/expenses" },
};

export default function ExpensesPage() {
  return <ExpensesView />;
}
