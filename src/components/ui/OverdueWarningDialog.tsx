"use client";

import { AnimatePresence, motion } from "motion/react";
import { TODAY, formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { salePaid, saleProposed, saleTotal } from "@/lib/calc";
import type { Sale } from "@/lib/types";

/** Peringatan invoice lewat jatuh tempo, dipakai di form jual & approval. */
export function OverdueWarningDialog({
  open,
  onClose,
  customerName,
  sales,
  onChangeCustomer,
  continueLabel = "Tetap lanjutkan",
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  sales: Sale[];
  onChangeCustomer?: () => void;
  continueLabel?: string;
}) {
  const total = sales.reduce(
    (a, s) => a + Math.max(saleTotal(s) - salePaid(s), 0),
    0,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[76] flex items-center justify-center p-4"
          style={{ background: "rgba(4,18,63,.5)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="card w-full max-w-lg overflow-hidden"
            style={{ boxShadow: "0 30px 80px -20px rgba(4,18,63,.45)" }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Peringatan tunggakan"
          >
            <div
              className="px-5 pt-4 pb-3 border-b"
              style={{ borderColor: "var(--ln)" }}
            >
              <div className="dkick">Perhatian</div>
              <h3 className="dtitle">Toko masih menunggak</h3>
            </div>

            <div className="px-5 py-4">
              <div
                className="rounded-xl px-3 py-2 text-[12.5px]"
                style={{
                  background: "var(--danger-bg)",
                  border: "1px solid #f6caca",
                  color: "#b91c1c",
                }}
              >
                <b>{customerName}</b> punya {sales.length} invoice lewat jatuh
                tempo dengan total tunggakan <b>{rp(total)}</b>.
              </div>

              <div className="mt-3 max-h-[40vh] overflow-y-auto">
                {sales.map((s) => {
                  const rem = Math.max(saleTotal(s) - salePaid(s), 0);
                  const late = s.due
                    ? Math.max(
                        0,
                        Math.round(
                          (Date.parse(`${TODAY}T00:00:00`) -
                            Date.parse(`${s.due}T00:00:00`)) /
                            86400000,
                        ),
                      )
                    : 0;
                  return (
                    <div
                      key={s.id}
                      className="py-2.5 border-b"
                      style={{ borderColor: "var(--ln)" }}
                    >
                      <div className="flex justify-between gap-2 text-[13px]">
                        <b style={{ color: "var(--nv)" }}>{s.id}</b>
                        <b className="num" style={{ color: "var(--er)" }}>
                          {rp(rem)}
                        </b>
                      </div>
                      <div className="text-[11.5px] mt-0.5" style={{ color: "var(--mu)" }}>
                        Jatuh tempo {formatDate(s.due)} · telat {late} hari
                      </div>
                      {saleProposed(s) > 0 && (
                        <span className="bd b-wa mt-1">
                          Menunggu approval pelunasan
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="px-5 py-3 border-t flex justify-end gap-2"
              style={{ borderColor: "var(--ln)" }}
            >
              {onChangeCustomer && (
                <button type="button" className="btn" onClick={onChangeCustomer}>
                  Ganti toko
                </button>
              )}
              <button type="button" className="btn p" onClick={onClose}>
                {continueLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
