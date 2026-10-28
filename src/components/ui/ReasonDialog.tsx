"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type ReasonResult = { ok: boolean; msg: string };

/** Modal konfirmasi dengan alasan wajib (hapus toko / hapus order). */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  placeholder = "Tulis alasan...",
  confirmLabel = "Kirim pengajuan",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => ReasonResult;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const text = reason.trim();
    if (!text) {
      setError("Alasan wajib diisi");
      return;
    }
    const res = onConfirm(text);
    if (!res.ok) {
      setError(res.msg);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          style={{ background: "rgba(4,18,63,.45)", backdropFilter: "blur(3px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="card w-full max-w-md overflow-hidden"
            style={{ boxShadow: "0 30px 80px -20px rgba(4,18,63,.45)" }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className="px-5 pt-4 pb-3 border-b"
              style={{ borderColor: "var(--ln)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="dkick">Konfirmasi</div>
                  <h3 className="dtitle">{title}</h3>
                </div>
                <button
                  type="button"
                  className="dclose"
                  onClick={onClose}
                  aria-label="Tutup"
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
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              {description && (
                <div className="text-[12.5px] mb-3" style={{ color: "var(--mu)" }}>
                  {description}
                </div>
              )}
              <label className="f">Alasan (wajib)</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={placeholder}
              />
              {error && (
                <div className="text-xs mt-1" style={{ color: "var(--er)" }}>
                  {error}
                </div>
              )}
            </div>

            <div
              className="px-5 py-3 border-t flex justify-end gap-2"
              style={{ borderColor: "var(--ln)" }}
            >
              <button type="button" className="btn" onClick={onClose}>
                Batal
              </button>
              <button type="button" className="btn danger" onClick={submit}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
