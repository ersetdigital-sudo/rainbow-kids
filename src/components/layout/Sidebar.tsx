"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { db, resetDemo } = useStore();
  const pending = db.approvals.filter((a) => a.status === "Menunggu").length;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside id="side" className={`side ${open ? "open" : ""}`}>
      <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: "rgba(255,255,255,.08)" }}>
        <div
          className="w-9 h-9 rounded-xl grid place-items-center flex-none"
          style={{ background: "#FEC40B" }}
        >
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
        <div className="leading-tight">
          <div className="font-bold text-[14px]">{db.biz.name}</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
            Business Suite
          </div>
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
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={isActive(item.href) ? "on" : undefined}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/approvals" && pending > 0 && (
                    <span className="npill">{pending}</span>
                  )}
                </Link>
              ))}
            </div>
          ),
        )}
      </nav>

      <div
        className="px-4 py-3 border-t text-[11px] flex justify-between items-center"
        style={{ color: "rgba(255,255,255,.45)", borderColor: "rgba(255,255,255,.08)" }}
      >
        <span>Prototipe · data dummy</span>
        <button
          type="button"
          className="underline"
          onClick={() => {
            if (window.confirm("Kembalikan semua data simulasi ke kondisi awal?")) {
              resetDemo();
            }
          }}
        >
          Reset demo
        </button>
      </div>
    </aside>
  );
}
