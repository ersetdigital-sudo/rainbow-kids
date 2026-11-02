"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

/** Layar masuk saat Supabase aktif. */
export function LoginScreen() {
  const { signIn } = useAuth();
  const [needsOwner, setNeedsOwner] = useState(false);
  const [tableReady, setTableReady] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Toko baru belum punya akun: tawarkan pembuatan Owner pertama.
  useEffect(() => {
    let active = true;
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((json: { needsOwner?: boolean; tableReady?: boolean }) => {
        if (!active) return;
        if (json?.needsOwner) setNeedsOwner(true);
        if (json?.tableReady === false) setTableReady(false);
      })
      .catch(() => {
        /* tanpa Supabase, mode lokal dipakai */
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    if (needsOwner) {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; msg?: string }
        | null;
      if (!json?.ok) {
        setBusy(false);
        setError(json?.msg || "Gagal membuat akun Owner");
        return;
      }
    }

    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.msg);
      setPassword("");
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "#F5F7FB" }}
    >
      <form
        className="card p-6 w-full max-w-sm"
        onSubmit={submit}
        aria-label="Masuk ke aplikasi"
      >
        <div
          className="w-11 h-11 rounded-xl grid place-items-center font-extrabold mb-4"
          style={{ background: "#04123F", color: "#FEC40B" }}
        >
          RK
        </div>
        <h1 className="text-lg font-bold" style={{ color: "var(--nv)" }}>
          {needsOwner ? "Buat akun Owner" : "Masuk"}
        </h1>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--mu)" }}>
          {needsOwner
            ? "Toko ini belum punya akun. Buat akun Owner pertama."
            : "Gunakan email & password yang dibuat Owner."}
        </p>

        {!tableReady && (
          <div
            className="text-[12px] mb-4 rounded-lg px-3 py-2"
            style={{
              background: "var(--wab)",
              border: "1px solid #f6e4a6",
              color: "var(--wa)",
            }}
          >
            Tabel data di Supabase belum dibuat. Jalankan{" "}
            <b>supabase/schema.sql</b> di SQL Editor Supabase dulu — tanpa itu
            data toko tidak tersimpan.
          </div>
        )}

        {needsOwner && (
          <>
            <label className="f">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={busy}
              required
            />
          </>
        )}

        <label className={needsOwner ? "f mt-3" : "f"}>Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          required
        />

        <label className="f mt-3">Password</label>
        <input
          type="password"
          autoComplete={needsOwner ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={needsOwner ? "Minimal 6 karakter" : undefined}
          disabled={busy}
          required
        />

        {error && (
          <div className="text-xs mt-2" style={{ color: "var(--er)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn p w-full justify-center mt-4"
          disabled={busy}
        >
          {busy ? "Memproses..." : needsOwner ? "Buat akun & masuk" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
