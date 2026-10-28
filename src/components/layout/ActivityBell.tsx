"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { findVariant, opnameDiff, purchaseTotal, variantLabel } from "@/lib/calc";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { IconName } from "@/lib/nav";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ApprovalDetailDrawer } from "@/components/modules/approvals/ApprovalDetailDrawer";
import { OpnameDrawer } from "@/components/modules/opname/OpnameDrawer";
import type { Approval, DB, Opname } from "@/lib/types";

const FILTERS = ["Semua", "Menunggu", "Disetujui", "Ditolak"] as const;
type Filter = (typeof FILTERS)[number];
type ActivityStatus = "Menunggu" | "Disetujui" | "Ditolak";

const KIND_META: Record<
  Approval["kind"],
  { label: string; icon: IconName }
> = {
  invoice: { label: "Penjualan", icon: "sales" },
  nota: { label: "Belanja Supplier", icon: "purch" },
  notaEdit: { label: "Belanja Supplier", icon: "purch" },
  variant: { label: "Ubah Produk-Varian", icon: "stock" },
  payment: { label: "Pelunasan", icon: "ar" },
  purchase: { label: "Status Bayar Pembelian", icon: "purch" },
  sale: { label: "Ubah Harga & Biaya", icon: "invoice" },
  customer: { label: "Pelanggan", icon: "cust" },
  customerDelete: { label: "Hapus Pelanggan", icon: "cust" },
  saleDelete: { label: "Hapus Penjualan", icon: "sales" },
};

/** Jenis approval yang punya drawer detail (sama dengan tombol Detail di /approvals). */
const DETAIL_KINDS = new Set<Approval["kind"]>([
  "invoice",
  "nota",
  "notaEdit",
  "purchase",
  "sale",
  "customer",
  "customerDelete",
  "saleDelete",
]);

type ActivityItem = {
  key: string;
  id: string;
  source: "approval" | "opname";
  label: string;
  icon: IconName;
  summary: string;
  detail?: string;
  status: ActivityStatus;
  submittedBy: string;
  submittedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  lastAt: string;
};

/** "YYYY-MM-DD" diberi jam netral agar bisa dibandingkan dengan timestamp. */
function sortStamp(value: string): string {
  return value.length > 10 ? value : `${value} 00:00`;
}

function stampText(value?: string): string {
  if (!value) return "-";
  return value.length > 10 ? value : formatDate(value);
}

function approvalActivity(db: DB, a: Approval): ActivityItem {
  const meta = KIND_META[a.kind];
  const base = {
    key: `a-${a.id}`,
    id: a.id,
    source: "approval" as const,
    label: meta.label,
    icon: meta.icon,
    status: a.status,
    submittedBy: a.user,
    submittedAt: a.time,
    decidedBy: a.by,
    decidedAt: a.decidedAt,
    lastAt: a.decidedAt ?? a.time,
  };

  switch (a.kind) {
    case "invoice": {
      const sale = db.sales.find((s) => s.id === a.saleId);
      const req = a.saleRequest;
      const total = req
        ? req.items.reduce((sum, i) => sum + i.qty * i.price, 0)
        : Number(a.after);
      return {
        ...base,
        summary: `${sale?.id ?? "Invoice baru"} · ${sale?.customer ?? req?.customer ?? "-"}`,
        detail: `Total penjualan ${rp(total)}`,
      };
    }
    case "sale": {
      const sale = db.sales.find((s) => s.id === a.saleId);
      return {
        ...base,
        summary: `${sale?.id ?? a.saleId ?? "Invoice"} · ${sale?.customer ?? "-"}`,
        detail: `Laba order ${rp(Number(a.after))}`,
      };
    }
    case "payment": {
      const sale = db.sales.find((s) => s.id === a.saleId);
      return {
        ...base,
        summary: `${sale?.id ?? a.saleId ?? "Invoice"} · ${sale?.customer ?? "-"}`,
        detail: `Pelunasan ${rp(Number(a.after))}`,
      };
    }
    case "purchase": {
      const p = db.purchases.find((x) => x.id === a.purchaseId);
      return {
        ...base,
        summary: `${p?.id ?? a.purchaseId ?? "Pembelian"} · ${p?.supplier ?? "-"}`,
        detail: p ? `Nota ${p.nota} · ${rp(purchaseTotal(p))}` : undefined,
      };
    }
    case "nota":
    case "notaEdit": {
      const p = db.purchases.find((x) => x.id === a.purchaseId);
      const req = a.purchaseRequest;
      const nota = req?.nota ?? p?.nota ?? "-";
      const supplier = req?.supplier ?? p?.supplier ?? "-";
      return {
        ...base,
        summary: `${a.kind === "notaEdit" ? "Revisi nota" : "Nota"} ${nota} · ${supplier}`,
        detail: `${rp(Number(a.after))}`,
      };
    }
    case "customer": {
      const customer = db.customers.find((c) => c.id === a.customerId);
      return {
        ...base,
        summary: `${a.customerName ?? customer?.name ?? "-"} · ${customer?.type ?? "Pelanggan"}`,
        detail:
          a.status === "Menunggu"
            ? "Pelanggan baru menunggu approval"
            : a.status === "Disetujui"
              ? "Pelanggan disetujui — status Aktif"
              : "Pelanggan ditolak — diarsipkan",
      };
    }
    case "customerDelete": {
      const customer = db.customers.find((c) => c.id === a.customerId);
      return {
        ...base,
        summary: `${a.customerName ?? customer?.name ?? "-"}`,
        detail: a.reason ? `Alasan: ${a.reason}` : "Pengajuan hapus pelanggan",
      };
    }
    case "saleDelete": {
      const snapshot = a.saleSnapshot;
      return {
        ...base,
        summary: `${snapshot?.id ?? a.saleId ?? "Invoice"} · ${snapshot?.customer ?? "-"}`,
        detail: a.reason ? `Alasan: ${a.reason}` : "Snapshot order tersimpan",
      };
    }
    default: {
      const detail =
        a.field === "name"
          ? `${a.type}: ${a.before} → ${a.after}`
          : `${a.type}: ${rp(Number(a.before))} → ${rp(Number(a.after))}`;
      return {
        ...base,
        summary: variantLabel(db, a.vid ?? ""),
        detail,
      };
    }
  }
}

function opnameActivity(db: DB, o: Opname): ActivityItem {
  const diffLines = o.lines.filter((l) => l.phys !== "" && l.phys !== l.sys);
  const diffValue = diffLines.reduce(
    (sum, l) => sum + opnameDiff(l) * (findVariant(db, l.vid)?.cost ?? 0),
    0,
  );
  const submittedAt = o.submittedAt ?? o.date;
  return {
    key: `o-${o.id}`,
    id: o.id,
    source: "opname",
    label: "Stok Opname",
    icon: "opname",
    status: o.status as ActivityStatus,
    summary: `${o.id} · ${o.lines.length} item`,
    detail: `${diffLines.length} item selisih${
      diffValue ? ` · ${rp(diffValue)}` : ""
    }`,
    submittedBy: o.sub ?? "—",
    submittedAt,
    decidedBy: o.by,
    decidedAt: o.decidedAt,
    lastAt: o.decidedAt ?? submittedAt,
  };
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Portal hanya dirender setelah hidrasi supaya HTML server tetap cocok. */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );
}

/** Lonceng Topbar: riwayat kegiatan approval & stok opname terbaru. */
export function ActivityBell() {
  const { db } = useStore();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("Semua");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [opnameId, setOpnameId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ top: 76, right: 24 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const pending = db.approvals.filter((a) => a.status === "Menunggu").length;

  const activities = useMemo(() => {
    const rows: ActivityItem[] = [
      ...db.approvals.map((a) => approvalActivity(db, a)),
      ...db.opnames
        .filter((o) => o.status !== "Draft")
        .map((o) => opnameActivity(db, o)),
    ];
    return rows.sort((a, b) =>
      sortStamp(b.lastAt).localeCompare(sortStamp(a.lastAt)),
    );
  }, [db]);

  const counts = useMemo(() => {
    const next: Record<Filter, number> = {
      Semua: activities.length,
      Menunggu: 0,
      Disetujui: 0,
      Ditolak: 0,
    };
    activities.forEach((a) => {
      next[a.status] += 1;
    });
    return next;
  }, [activities]);

  const visible = useMemo(
    () =>
      activities
        .filter((a) => filter === "Semua" || a.status === filter)
        .slice(0, 30),
    [activities, filter],
  );

  const positionPanel = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: Math.round(rect.bottom + 8),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => positionPanel();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggle = () => {
    if (!open) positionPanel();
    setOpen((o) => !o);
  };

  const openActivity = (item: ActivityItem) => {
    setOpen(false);
    if (item.source === "opname") {
      setOpnameId(item.id);
      return;
    }
    const approval = db.approvals.find((a) => a.id === item.id);
    if (approval && DETAIL_KINDS.has(approval.kind)) {
      setApprovalId(item.id);
      return;
    }
    router.push(`/approvals?focus=${encodeURIComponent(item.id)}`);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="tb-btn"
        onClick={toggle}
        aria-label={
          pending > 0
            ? `Riwayat kegiatan, ${pending} approval menunggu`
            : "Riwayat kegiatan"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {pending > 0 && <span className="tb-dot" />}
      </button>

      {isClient &&
        createPortal(
          <>
            <AnimatePresence>
              {open && (
                <motion.div
                  className="act-layer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <button
                    type="button"
                    className="act-back"
                    aria-label="Tutup riwayat kegiatan"
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    className="act-pop"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Riwayat kegiatan"
                    style={
                      {
                        "--act-top": `${anchor.top}px`,
                        "--act-right": `${anchor.right}px`,
                      } as React.CSSProperties
                    }
                    initial={
                      isMobile ? { y: "100%" } : { y: -10, scale: 0.98 }
                    }
                    animate={{ y: 0, scale: 1 }}
                    exit={isMobile ? { y: "100%" } : { y: -10, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  >
                    <div className="act-grip" />
                    <div className="act-head">
                      <div>
                        <div className="act-title">Riwayat kegiatan</div>
                        <div className="act-sub">
                          Approval &amp; stok opname terbaru
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dclose"
                        onClick={() => setOpen(false)}
                        aria-label="Tutup"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div
                      className="act-tabs"
                      role="tablist"
                      aria-label="Filter status"
                    >
                      {FILTERS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          role="tab"
                          aria-selected={filter === f}
                          className={`act-tab${filter === f ? " on" : ""}`}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                          <span className="act-n">{counts[f]}</span>
                        </button>
                      ))}
                    </div>

                    <div className="act-list">
                      {visible.length === 0 ? (
                        <div className="act-empty">
                          Tidak ada kegiatan pada filter ini.
                        </div>
                      ) : (
                        visible.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className="act-item"
                            onClick={() => openActivity(item)}
                          >
                            <span className="act-ic" aria-hidden="true">
                              <Icon name={item.icon} />
                            </span>
                            <span className="act-main">
                              <span className="act-toprow">
                                <span className="act-kind">{item.label}</span>
                                <Badge tone={item.status}>{item.status}</Badge>
                              </span>
                              <span className="act-sum">{item.summary}</span>
                              {item.detail && (
                                <span className="act-detail">{item.detail}</span>
                              )}
                              <span className="act-meta">
                                Diajukan {item.submittedBy} ·{" "}
                                {stampText(item.submittedAt)}
                              </span>
                              {item.decidedBy && (
                                <span className="act-meta">
                                  {item.status} oleh {item.decidedBy}
                                  {item.decidedAt
                                    ? ` · ${stampText(item.decidedAt)}`
                                    : ""}
                                </span>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="act-foot">
                      <Link
                        href="/approvals"
                        className="act-more"
                        onClick={() => setOpen(false)}
                      >
                        Lihat semua
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <ApprovalDetailDrawer
              key={`activity-approval-${approvalId ?? "none"}`}
              approvalId={approvalId}
              onClose={() => setApprovalId(null)}
            />
            <OpnameDrawer
              opnameId={opnameId}
              onClose={() => setOpnameId(null)}
            />
          </>,
          document.body,
        )}
    </>
  );
}
