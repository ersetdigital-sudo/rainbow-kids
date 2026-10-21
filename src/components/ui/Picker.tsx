"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

export type PickerOption = {
  id: string;
  name: string;
  sub?: string;
  badge?: string;
};

/**
 * Popup pemilih data (pelanggan / supplier): cari, pilih, atau tambah baru
 * langsung dari dalam popup.
 */
export function Picker({
  open,
  onClose,
  title,
  options,
  value,
  onSelect,
  onCreate,
  createLabel = "Tambah baru",
  createExtra,
  emptyText = "Belum ada data",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  value?: string;
  onSelect: (o: PickerOption) => void;
  onCreate: (name: string) => { ok: boolean; msg: string };
  createLabel?: string;
  createExtra?: React.ReactNode;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.sub ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const close = () => {
    setQuery("");
    setCreating(false);
    setNewName("");
    setError("");
    onClose();
  };

  const submitCreate = () => {
    const res = onCreate(newName);
    if (!res.ok) {
      setError(res.msg);
      return;
    }
    setNewName("");
    setCreating(false);
    setError("");
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(4,18,63,.45)", backdropFilter: "blur(3px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
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
            <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="dkick">Pilih data</div>
                  <h3 className="dtitle">{title}</h3>
                </div>
                <button
                  type="button"
                  className="dclose"
                  onClick={close}
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
              <input
                className="mt-3"
                placeholder={`Cari ${title.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {list.length === 0 && (
                <div className="text-sm text-center py-6" style={{ color: "var(--mu)" }}>
                  {emptyText}
                </div>
              )}
              {list.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onSelect(o);
                    close();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition"
                  style={{
                    background:
                      value === o.id ? "var(--acs)" : "transparent",
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] truncate">
                      {o.name}
                    </div>
                    {o.sub && (
                      <div className="text-xs truncate" style={{ color: "var(--mu)" }}>
                        {o.sub}
                      </div>
                    )}
                  </div>
                  {o.badge && <span className="bd b-in flex-none">{o.badge}</span>}
                </button>
              ))}
            </div>

            <div className="px-5 py-3 border-t" style={{ borderColor: "var(--ln)" }}>
              {creating ? (
                <div>
                  {createExtra}
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      placeholder={`Nama ${title.toLowerCase()} baru`}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitCreate();
                      }}
                    />
                    <button
                      type="button"
                      className="btn p flex-none"
                      onClick={submitCreate}
                    >
                      Simpan
                    </button>
                  </div>
                  {error && (
                    <div className="text-xs mt-1" style={{ color: "var(--er)" }}>
                      {error}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-xs mt-2 underline"
                    style={{ color: "var(--mu)" }}
                    onClick={() => {
                      setCreating(false);
                      setError("");
                    }}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn s w-full justify-center"
                  onClick={() => setCreating(true)}
                >
                  + {createLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
