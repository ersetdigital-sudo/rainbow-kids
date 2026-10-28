"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import type { AppUser, Role } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "Approver", label: "Approver" },
  { value: "User", label: "User" },
];

export function EditUserDrawer({
  user,
  index,
  onClose,
}: {
  user: AppUser | null;
  index: number;
  onClose: () => void;
}) {
  const { updateUser, toast } = useStore();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "User");
  const locked = user?.role === "Owner";

  const submit = () => {
    const res = updateUser(index, { name, email, role: locked ? "Owner" : role });
    toast(res.msg);
    if (res.ok) onClose();
  };

  return (
    <Drawer
      open={Boolean(user)}
      onClose={onClose}
      title="Edit pengguna"
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
            value={locked ? "Owner" : role}
            disabled={locked}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {locked ? (
              <option value="Owner">Owner</option>
            ) : (
              ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {locked && (
        <div className="sim mt-3">
          Role Owner terkunci — nama dan email tetap bisa diubah.
        </div>
      )}
    </Drawer>
  );
}
