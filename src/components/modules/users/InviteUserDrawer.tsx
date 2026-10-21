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
  const [role, setRole] = useState<Role>("Staff");

  const submit = () => {
    const res = inviteUser({ name, email, role });
    toast(res.msg);
    if (res.ok) {
      setName("");
      setEmail("");
      setRole("Staff");
      onClose();
    }
  };

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
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      </div>
    </Drawer>
  );
}
