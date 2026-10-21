"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { findVariant, opnameDiff } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import type { Opname } from "@/lib/types";

const CAUSES = [
  "Rusak",
  "Hilang",
  "Salah input",
  "Sampel / display",
  "Kadaluarsa",
  "Lainnya",
];

export function OpnameDrawer({
  opnameId,
  onClose,
}: {
  opnameId: string | null;
  onClose: () => void;
}) {
  const { db, updateOpnameLine, submitOpname, decideOpname, toast } = useStore();
  const o = db.opnames.find((x) => x.id === opnameId) ?? null;

  const diffLines = useMemo(
    () => (o ? o.lines.filter((l) => l.phys !== "" && l.phys !== l.sys) : []),
    [o],
  );

  if (!o) return null;

  const editable = o.status === "Draft";
  const diffValue = diffLines.reduce((a, l) => {
    const v = findVariant(db, l.vid);
    return a + opnameDiff(l) * (v?.cost ?? 0);
  }, 0);
  const missing = diffLines.filter((l) => !l.note).length;

  const lastPurchase = (vid: string) => {
    const ps = db.purchases.filter((p) => p.items.some((i) => i.vid === vid));
    const p = ps[ps.length - 1];
    if (!p) return "-";
    const item = p.items.find((i) => i.vid === vid);
    return `${p.id} · ${formatDate(p.date)} · +${item?.qty ?? 0}`;
  };

  const diffText = (l: (typeof o.lines)[number]) => {
    if (l.phys === "") return <span style={{ color: "var(--mu)" }}>0</span>;
    const d = opnameDiff(l);
    return (
      <span
        style={{
          color: d < 0 ? "var(--er)" : d > 0 ? "var(--ok)" : "var(--mu)",
        }}
      >
        {d > 0 ? "+" : ""}
        {d}
      </span>
    );
  };

  const submit = () => {
    const res = submitOpname(o.id);
    toast(res.msg);
  };

  return (
    <Drawer
      open={Boolean(opnameId)}
      onClose={onClose}
      wide
      title={`Stok opname ${o.id} · ${formatDate(o.date)}`}
      footer={
        editable ? (
          <>
            <button type="button" className="btn" onClick={onClose}>
              Simpan draft
            </button>
            <button type="button" className="btn p" onClick={submit}>
              Ajukan persetujuan
            </button>
          </>
        ) : o.status === "Menunggu" ? (
          <>
            <button
              type="button"
              className="btn d"
              onClick={() => {
                decideOpname(o.id, false);
                toast("Opname ditolak");
                onClose();
              }}
            >
              Tolak
            </button>
            <button
              type="button"
              className="btn p"
              onClick={() => {
                decideOpname(o.id, true);
                toast("Stok disesuaikan");
                onClose();
              }}
            >
              Setujui &amp; sesuaikan stok
            </button>
          </>
        ) : (
          <>
            <span className="text-sm mr-auto" style={{ color: "var(--mu)" }}>
              {o.status} oleh {o.by || "-"}
            </span>
            <button type="button" className="btn p" onClick={onClose}>
              Tutup
            </button>
          </>
        )
      }
    >
      {editable && (
        <div className="sim mb-3">
          Isi stok fisik hasil hitung. Kosongkan jika belum dihitung (dianggap
          sesuai).
        </div>
      )}

      <div className="tw">
        <table className="t">
          <thead>
            <tr>
              <th>Barang</th>
              <th>Pembelian terakhir</th>
              <th className="r">Sistem</th>
              <th className="r">Fisik</th>
              <th className="r">Selisih</th>
              <th>Penyebab</th>
            </tr>
          </thead>
          <tbody>
            {o.lines.map((l, i) => {
              const label = (() => {
                for (const p of db.products) {
                  const v = p.variants.find((x) => x.id === l.vid);
                  if (v) return `${p.name} · ${v.name}`;
                }
                return l.vid;
              })();
              return (
                <tr key={l.vid}>
                  <td data-label="Barang" className="font-semibold">
                    {label}
                  </td>
                  <td data-label="Pembelian terakhir" className="text-xs" style={{ color: "var(--mu)" }}>
                    {lastPurchase(l.vid)}
                  </td>
                  <td data-label="Sistem" className="r">
                    {l.sys}
                  </td>
                  <td data-label="Fisik" className="r">
                    {editable ? (
                      <input
                        type="number"
                        className="w-20 text-right"
                        value={l.phys === "" ? "" : l.phys}
                        onChange={(e) =>
                          updateOpnameLine(o.id, i, {
                            phys: e.target.value === "" ? "" : +e.target.value,
                          })
                        }
                      />
                    ) : l.phys === "" ? (
                      l.sys
                    ) : (
                      l.phys
                    )}
                  </td>
                  <td data-label="Selisih" className="r font-semibold">
                    {diffText(l)}
                  </td>
                  <td data-label="Penyebab">
                    {editable ? (
                      <select
                        className="w-40"
                        value={l.note}
                        onChange={(e) =>
                          updateOpnameLine(o.id, i, { note: e.target.value })
                        }
                      >
                        <option value="">—</option>
                        {CAUSES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      l.note || "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[13px] mt-4">
        <div className="rounded-lg p-3" style={{ background: "#F5F7FB" }}>
          Item selisih<div className="font-bold text-lg">{diffLines.length}</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: "#F5F7FB" }}>
          Nilai selisih (modal)
          <div
            className="font-bold text-lg num"
            style={{ color: diffValue < 0 ? "var(--er)" : "inherit" }}
          >
            {rp(diffValue)}
          </div>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: missing ? "var(--wab)" : "#F5F7FB" }}
        >
          Tanpa penyebab<div className="font-bold text-lg">{missing}</div>
        </div>
      </div>
    </Drawer>
  );
}

export function OpnameStatusBadge({ status }: { status: Opname["status"] }) {
  return <Badge tone={status}>{status}</Badge>;
}
