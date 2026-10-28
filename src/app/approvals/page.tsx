import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalsView } from "@/components/modules/approvals/ApprovalsView";

export const metadata: Metadata = {
  title: "Approval & Audit Log",
  description:
    "Audit trail perubahan harga modal, harga jual, dan nama varian lengkap dengan nilai sebelum dan sesudah.",
  alternates: { canonical: "/approvals" },
};

async function ApprovalsContent({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
  const { focus } = await searchParams;
  const focusId = Array.isArray(focus) ? focus[0] : focus;
  return <ApprovalsView key={focusId ?? "all"} focusId={focusId ?? null} />;
}

export default function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-40" aria-hidden="true" />}>
      <ApprovalsContent searchParams={searchParams} />
    </Suspense>
  );
}
