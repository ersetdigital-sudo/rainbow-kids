"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { db } = useStore();
  const owner = db.users.find((u) => u.role === "Owner") ?? db.users[0];
  const pending = db.approvals.filter((a) => a.status === "Menunggu").length;
  const initials = owner?.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

  return (
    <header className="top">
      <button
        type="button"
        className="tb-btn"
        onClick={onMenu}
        aria-label="Buka atau tutup sidebar"
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
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <GlobalSearch />

      <div className="tb-right">
        <Link
          href="/approvals"
          className="tb-btn"
          aria-label={
            pending > 0 ? `Approval, ${pending} menunggu` : "Approval & audit"
          }
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
        </Link>

        <div className="tb-user">
          <div className="tb-av">{initials}</div>
          <div className="tb-tx">
            <div className="tb-hi">Selamat datang,</div>
            <div className="tb-nm">{owner?.name}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
