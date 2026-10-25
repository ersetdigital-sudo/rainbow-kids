"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHead } from "@/components/ui/PageHead";
import { InviteUserDrawer } from "./InviteUserDrawer";
import type { AppUser, ModuleKey, Role } from "@/lib/types";

const MODULES: [ModuleKey, string][] = [
  ["dash", "Dashboard"],
  ["sales", "Penjualan"],
  ["stock", "Produk & Stok"],
  ["purch", "Pembelian"],
  ["opname", "Stok Opname"],
  ["ar", "Piutang"],
  ["report", "Laporan"],
  ["approval", "Approval"],
  ["users", "Pengguna"],
];

const TONE: Record<string, string> = {
  Tidak: "b-er",
  Lihat: "b-in",
  Input: "b-in",
  Ajukan: "b-wa",
  Penuh: "b-ok",
  Setujui: "b-ac",
};

export function UsersView() {
  const { db, setUserRole, toggleUser, cyclePerm, toast } = useStore();
  const [inviteOpen, setInviteOpen] = useState(false);

  const columns: Column<AppUser>[] = [
    {
      key: "name",
      label: "Nama",
      render: (u) => (
        <span className="font-semibold inline-flex items-center">
          <span
            className="inline-grid place-items-center w-8 h-8 rounded-full mr-2 text-xs font-bold"
            style={{ background: "var(--acs)", color: "var(--ac2)" }}
          >
            {u.name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </span>
          {u.name}
        </span>
      ),
    },
    { key: "email", label: "Email", render: (u) => u.email },
    {
      key: "role",
      label: "Role",
      render: (u, i) => (
        <select
          className="w-28"
          value={u.role}
          disabled={u.role === "Owner"}
          onChange={(e) => {
            setUserRole(i, e.target.value as Role);
            toast("Role diperbarui");
          }}
        >
          {(["Owner", "Admin", "Approver", "User"] as Role[]).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (u, i) => (
        <button
          type="button"
          onClick={() => toggleUser(i)}
          className={`bd ${u.active ? "b-ok" : "b-in"}`}
        >
          {u.active ? "Aktif" : "Nonaktif"}
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Pengguna & Hak Akses"
        subtitle="Atur siapa boleh melihat, mencatat, atau menyetujui."
        actions={
          <button
            type="button"
            className="btn p"
            onClick={() => setInviteOpen(true)}
          >
            + Undang pengguna
          </button>
        }
      />

      <div className="card mb-4">
        <DataTable
          columns={columns}
          rows={db.users}
          rowKey={(u) => u.email}
        />
      </div>

      <div className="card">
        <div className="px-5 pt-5 pb-1 font-bold">
          Matriks hak akses per role
        </div>
        <div className="px-5 pb-3 text-xs" style={{ color: "var(--mu)" }}>
          Klik label untuk mengganti level akses (simulasi).
        </div>
        <div className="tw">
          <table className="t pm">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Owner</th>
                <th>Admin</th>
                <th>Approver</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(([key, label]) => (
                <tr key={key}>
                  <td data-label="Modul" className="font-semibold">
                    {label}
                  </td>
                  {(["Owner", "Admin", "Approver", "User"] as Role[]).map((role) => {
                    const v = db.perms[role][key];
                    return (
                      <td key={role} data-label={role}>
                        <button
                          type="button"
                          className={`bd ${TONE[v] ?? "b-in"}`}
                          disabled={role === "Owner"}
                          onClick={() => {
                            cyclePerm(role, key);
                            toast(`Hak akses ${label} · ${role} diperbarui`);
                          }}
                        >
                          {v}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="px-5 py-4 text-xs flex flex-wrap gap-3 border-t"
          style={{ borderColor: "var(--ln)", color: "var(--mu)" }}
        >
          <span>
            <b>Lihat</b>: hanya membaca
          </span>
          <span>
            <b>Input</b>: mencatat data baru
          </span>
          <span>
            <b>Ajukan</b>: perubahan perlu approval
          </span>
          <span>
            <b>Penuh</b>: tambah, ubah, hapus
          </span>
          <span>
            <b>Setujui</b>: menyetujui perubahan
          </span>
        </div>
      </div>

      <InviteUserDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
