"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NAV, navVisible } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { useApproverAccess } from "@/lib/perms";
import { Icon } from "@/components/ui/Icon";

export function Sidebar({
  open,
  onClose,
  collapsed = false,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { db } = useStore();
  const { configured } = useAuth();
  const { allowed: canApprove } = useApproverAccess();
  const pending = canApprove
    ? db.approvals.filter((a) => a.status === "Menunggu").length
    : 0;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      id="side"
      aria-label="Navigasi utama"
      className={`side${open ? " open" : ""}${collapsed ? " collapsed" : ""}`}
    >
      <div className="side-hd">
        <div className="side-lg">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 17a9 9 0 0 1 18 0" stroke="#04123F" />
            <path d="M6.5 17a5.5 5.5 0 0 1 11 0" stroke="#04123F" opacity=".7" />
            <path d="M10 17a2 2 0 0 1 4 0" stroke="#04123F" opacity=".45" />
          </svg>
        </div>
        <div className="side-brand">
          <div className="side-nm">{db.biz.name || "Toko Anda"}</div>
          <div className="side-sub">Kasir &amp; Inventory</div>
        </div>
      </div>

      <nav className="nav flex-1 overflow-y-auto px-3 pb-2">
        {NAV.map((group, gi) =>
          "heading" in group ? (
            <div key={`h-${gi}`} className="navh">
              {group.heading}
            </div>
          ) : (
            <div key={`g-${gi}`}>
              {group.items
                .filter((item) => navVisible(item.href, canApprove))
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    className={isActive(item.href) ? "on" : undefined}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="navl flex-1">{item.label}</span>
                    {item.href === "/approvals" && pending > 0 && (
                      <span className="npill">{pending}</span>
                    )}
                  </Link>
                ))}
            </div>
          ),
        )}
      </nav>

      <div className="side-ft">
        <div className="side-note">
          {configured ? "Data tersimpan di Supabase" : "Data tersimpan di browser ini"}
        </div>
        <Link href="/settings" onClick={onClose} className="side-reset">
          Atur data toko
        </Link>
      </div>
    </aside>
  );
}
