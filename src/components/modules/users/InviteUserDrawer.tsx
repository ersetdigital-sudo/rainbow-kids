"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Drawer } from "@/components/ui/Drawer";
import type { Role } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteUserDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, inviteUser, toast } = useStore();
  const { configured } = useAuth();
  const hasOwner = db.users.some((u) => u.role === "Owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(hasOwner ? "User" : "Owner");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return setError("Isi nama");
    if (!EMAIL_RE.test(cleanEmail)) return setError("Format email tidak valid");
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return setError("Email itu sudah dipakai pengguna lain");
    }
    if (configured && password.length < 6) {
      return setError("Password minimal 6 karakter");
    }

    // Supabase aktif: buat akun login (email + password) lebih dulu.
    if (configured) {
      setBusy(true);
      const { data } = (await getSupabase()?.auth.getSession()) ?? {
        data: { session: null },
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          role,
          password,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; msg?: string }
        | null;
      setBusy(false);
      if (!json?.ok) {
        setError(json?.msg || "Gagal membuat akun");
        return;
      }
    }

    const result = inviteUser({ name: cleanName, email: cleanEmail, role });
    toast(result.msg);
    if (!result.ok) {
      setError(result.msg);
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setRole("User");
    onClose();
  };

  const ROLE_OPTIONS: { value: Role; label: string }[] = hasOwner
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
        {configured && (
          <div className="sm:col-span-3">
            <label className="f">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
            <div className="text-[11.5px] mt-1" style={{ color: "var(--mu)" }}>
              Dipakai pengguna ini untuk masuk ke aplikasi.
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs mt-3" style={{ color: "var(--er)" }}>
          {error}
        </div>
      )}
    </Drawer>
  );
}
