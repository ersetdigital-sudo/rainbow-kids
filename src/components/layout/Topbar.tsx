"use client";

import { useStore } from "@/lib/store";
import { ActivityBell } from "./ActivityBell";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { db } = useStore();
  const owner = db.users.find((u) => u.role === "Owner") ?? db.users[0];
  const active =
    db.users.find((u) => `${u.name} (${u.role})` === db.user.trim()) ?? owner;
  const initials = active?.name
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
        <ActivityBell />

        <div className="tb-user">
          <div className="tb-av">{initials}</div>
          <div className="tb-tx">
            <div className="tb-hi">Selamat datang,</div>
            <div className="tb-nm">{active?.name}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
