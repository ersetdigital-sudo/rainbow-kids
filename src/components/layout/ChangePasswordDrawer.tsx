"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { changeOwnPassword } from "@/lib/users";
import { Drawer } from "@/components/ui/Drawer";

const MIN_PASSWORD = 6;

/** Form ganti password untuk akun yang sedang masuk (semua role). */
export function ChangePasswordDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    onClose();
  };

  const submit = async () => {
    setError("");
    if (!current) return setError("Isi password lama");
    if (next.length < MIN_PASSWORD) {
      return setError(`Password baru minimal ${MIN_PASSWORD} karakter`);
    }
    if (next === current) {
      return setError("Password baru harus berbeda dari password lama");
    }
    if (next !== confirm) return setError("Konfirmasi password tidak sama");

    setBusy(true);
    const res = await changeOwnPassword(current, next);
    setBusy(false);
    if (!res.ok) return setError(res.msg);
    toast(res.msg);
    close();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Ganti password"
      footer={
        <>
          <button type="button" className="btn" onClick={close}>
            Batal
          </button>
          <button
            type="button"
            className="btn p"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Menyimpan..." : "Simpan password"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <label className="f" htmlFor="pw-current">
            Password lama
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="f" htmlFor="pw-next">
            Password baru
          </label>
          <input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={`Minimal ${MIN_PASSWORD} karakter`}
          />
        </div>
        <div>
          <label className="f" htmlFor="pw-confirm">
            Ulangi password baru
          </label>
          <input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="text-xs mt-3" style={{ color: "var(--er)" }}>
          {error}
        </div>
      )}
    </Drawer>
  );
}
