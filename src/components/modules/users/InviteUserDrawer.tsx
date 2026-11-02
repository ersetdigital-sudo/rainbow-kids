"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import type { Role } from "@/lib/types";

export function InviteUserDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, inviteUser, toast } = useStore();
  const hasOwner = db.users.some((u) => u.role === "Owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(hasOwner ? "User" : "Owner");

  const submit = () => {
    const res = inviteUser({ name, email, role });
    toast(res.msg);
    if (res.ok) {
      setName("");
      setEmail("");
      setRole("User");
      onClose();
    }
  };

  const ROLE_OPTIONS: { value: Role; label: string }[] =
    hasOwner
      ? [
          { value: "User", label: "User" },
          { value: "Admin", label: "Admin" },
          { value: "Approver", label: "Approver" },
        ]
      : [
          { value: "Owner", label: "Owner" },
          { value: "User", label: "User" },
          { value: "Admin", label: "Admin" },
          { value: "Approver", label: "Approver" },
        ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Tambah pengguna"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            Simpan
          </button>
        </>
      }
    >
      {!hasOwner && (
        <div className="sim mb-3">
          Belum ada Owner. Pengguna pertama yang dibuat sebaiknya ber-role Owner.
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="f">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="f">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="f">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Drawer>
  );
}
