"use client";

import Link from "next/link";
import { dayLabel, TODAY } from "@/lib/date";
import { useStore } from "@/lib/store";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { db } = useStore();
  const owner = db.users.find((u) => u.role === "Owner") ?? db.users[0];

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-16 border-b"
      style={{
        borderColor: "var(--ln)",
        background: "rgba(255,255,255,.88)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        type="button"
        className="lg:hidden btn s"
        onClick={onMenu}
        aria-label="Menu"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="text-sm hidden sm:block" style={{ color: "var(--mu)" }}>
        {dayLabel(TODAY)}
      </div>
      <div className="flex-1" />

      <Link href="/approvals" className="btn s">
        Approval
      </Link>

      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white flex-none"
          style={{ background: "#04123F", color: "#FEC40B" }}
        >
          {owner?.name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="hidden sm:block leading-tight text-[13px]">
          <div className="font-semibold">{owner?.name}</div>
          <div className="text-[11px]" style={{ color: "var(--mu)" }}>
            {owner?.role}
          </div>
        </div>
      </div>
    </header>
  );
}
