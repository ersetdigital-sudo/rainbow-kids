"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  kicker = "Rainbow Kids",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  kicker?: string;
}) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Kedua sumbu selalu dianimasikan ke 0 supaya tidak ada transform sisa
  // saat breakpoint berubah (mis. desktop -> mobile).
  const hidden = isMobile ? { x: 0, y: "100%" } : { x: "100%", y: 0 };
  const shown = { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`mbox ${wide ? "wide" : ""}`}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="dhead">
              <div className="dgrip" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="dkick">{kicker}</div>
                  <h3 className="dtitle">{title}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="dclose"
                  aria-label="Tutup"
                  type="button"
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
            <div className="dbody">{children}</div>
            {footer && <div className="dfoot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
