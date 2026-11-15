"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { resetAccountPassword } from "@/lib/users";
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
  const [busy, setBusy] = useState(false);
  const { configured } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const locked = user?.role === "Owner";

  /** Owner menetapkan password baru untuk akun ini (reset bila lupa). */
  const resetPassword = async () => {
    setPwError("");
    if (!user) return;
    if (newPassword.length < 6) return setPwError("Password minimal 6 karakter");
    setPwBusy(true);
    // Pakai email akun yang tersimpan, bukan isi kolom email yang belum disimpan.
    const res = await resetAccountPassword(user.email, newPassword);
    setPwBusy(false);
    if (!res.ok) return setPwError(res.msg);
    setNewPassword("");
    toast(`Password ${user.name} berhasil diganti`);
  };

  const submit = async () => {
    setBusy(true);
    const res = await updateUser(index, {
      name,
      email,
      role: locked ? "Owner" : role,
    });
    setBusy(false);
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
          <button
            type="button"
            className="btn p"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Menyimpan..." : "Simpan"}
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

      {configured && (
        <>
          <div className="dsec">Ganti / reset password</div>
          <div className="grid sm:grid-cols-3 gap-2 items-end">
            <div className="sm:col-span-2">
              <label className="f" htmlFor="reset-password">
                Password baru
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                placeholder="Minimal 6 karakter"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn"
              onClick={resetPassword}
              disabled={pwBusy}
            >
              {pwBusy ? "Menyimpan..." : "Ganti password"}
            </button>
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--mu)" }}>
            Password baru langsung berlaku untuk {user?.name ?? "pengguna ini"};
            sampaikan ke yang bersangkutan, lalu sarankan menggantinya sendiri
            lewat ikon kunci di pojok kanan atas.
          </div>
          {pwError && (
            <div role="alert" className="text-xs mt-2" style={{ color: "var(--er)" }}>
              {pwError}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
