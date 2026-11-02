"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { ActivityBell } from "./ActivityBell";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { db } = useStore();
  const { configured, signOut, session } = useAuth();
  const owner = db.users.find((u) => u.role === "Owner") ?? db.users[0];
  const active =
    db.users.find((u) => `${u.name} (${u.role})` === db.user.trim()) ?? owner;
  // Data toko belum termuat dari Supabase: tetap tampilkan akun yang login.
  const self = session?.user;
  const selfName =
    (self?.user_metadata as { name?: string } | undefined)?.name?.trim() ||
    self?.email ||
    "";
  const displayName = active?.name || selfName || "Belum ada pengguna";
  const initials = (active?.name ?? selfName)
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            <div className="tb-nm">{displayName}</div>
          </div>
        </div>

        {configured && (
          <button
            type="button"
            className="tb-btn"
            onClick={() => void signOut()}
            aria-label="Keluar"
            title="Keluar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
