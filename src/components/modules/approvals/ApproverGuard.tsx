"use client";

import Link from "next/link";
import { useApproverAccess } from "@/lib/perms";

/**
 * Penjaga halaman Approval & Audit: hanya role dengan level "Setujui" pada
 * modul approval (sekarang Approver dan Owner). Role lain hanya bisa
 * mengajukan approval dari modulnya masing-masing.
 */
export function ApproverGuard({ children }: { children: React.ReactNode }) {
  const { ready, allowed } = useApproverAccess();

  if (!ready) return <div className="min-h-40" aria-hidden="true" />;

  if (allowed) return <>{children}</>;

  return (
    <div className="card p-6 max-w-xl">
      <div className="font-bold text-lg mb-1">Tidak punya akses</div>
      <p className="text-sm" style={{ color: "var(--mu)" }}>
        Halaman Approval &amp; Audit hanya bisa dibuka pengguna dengan hak akses
        &ldquo;Setujui&rdquo; pada modul Approval. Pengajuan tetap bisa dikirim
        dari modul Penjualan, Piutang, Produk, Pembelian, dan Data Toko.
      </p>
      <Link href="/" className="btn s inline-flex mt-4">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
