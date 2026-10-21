import type { Metadata } from "next";
import { ApprovalsView } from "@/components/modules/approvals/ApprovalsView";

export const metadata: Metadata = {
  title: "Approval & Audit Log",
  description:
    "Audit trail perubahan harga modal, harga jual, dan nama varian lengkap dengan nilai sebelum dan sesudah.",
  alternates: { canonical: "/approvals" },
};

export default function ApprovalsPage() {
  return <ApprovalsView />;
}
