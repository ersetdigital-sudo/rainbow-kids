"use client";

import { AnimatePresence, motion } from "motion/react";

/** Dialog konfirmasi sederhana untuk tindakan yang mengubah/menghapus data. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Lanjutkan",
  danger = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[77] flex items-center justify-center p-4"
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
              <div className="dkick">Konfirmasi</div>
              <h3 className="dtitle">{title}</h3>
            </div>

            {description && (
              <div
                className="px-5 py-4 text-[12.5px]"
                style={{ color: "var(--mu)" }}
              >
                {description}
              </div>
            )}

            <div
              className="px-5 py-3 border-t flex justify-end gap-2"
              style={{ borderColor: "var(--ln)" }}
            >
              <button type="button" className="btn" onClick={onClose}>
                Batal
              </button>
              <button
                type="button"
                className={danger ? "btn danger" : "btn p"}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
