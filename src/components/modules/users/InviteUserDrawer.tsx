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
  const { inviteUser, toast } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("User");

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

  const ROLE_OPTIONS: { value: Role; label: string }[] = [
    { value: "User", label: "User" },
    { value: "Admin", label: "Admin" },
    { value: "Approver", label: "Approver" },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Undang pengguna"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn p" onClick={submit}>
            Kirim undangan
          </button>
        </>
      }
    >
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
