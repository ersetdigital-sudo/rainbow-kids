"use client";

import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";
import { itemProfit, purchaseTotal, variantLabel } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";

/**
 * Rincian pengajuan approval: isi satu nota belanja supplier
 * atau usulan harga & biaya sebuah invoice penjualan.
 */
export function ApprovalDetailDrawer({
  approvalId,
  onClose,
}: {
  approvalId: string | null;
  onClose: () => void;
}) {
  const { db } = useStore();
  const a = db.approvals.find((x) => x.id === approvalId);

  if (!a) return null;

  /* ---------------- Nota belanja supplier ---------------- */
  if (a.kind === "nota") {
    const p = db.purchases.find((x) => x.id === a.purchaseId);
    return (
      <Drawer
        open={Boolean(approvalId)}
        onClose={onClose}
        title="Detail nota belanja"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        }
      >
        <div className="sdtop">
          <div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {p ? `Nota ${p.nota}` : "Nota"}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {p?.supplier ?? a.purchaseId}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🧾</span>
            <span>Barang yang dibelanjakan</span>
            <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
              {p?.items.length ?? 0} jenis
            </span>
          </div>

          {p?.items.map((i) => {
            const change = (a.costChanges ?? []).find((c) => c.vid === i.vid);
            const before = change ? change.before : i.cost;
            const delta = i.cost - before;
            return (
              <div
                key={i.vid}
                className="flex justify-between gap-3 py-2 border-b"
                style={{ borderColor: "var(--ln)" }}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[13.5px]" style={{ color: "var(--nv)" }}>
                    {variantLabel(db, i.vid)}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--mu)" }}>
                    {i.qty} × {rp(i.cost)} · harga sebelumnya {rp(before)}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="num font-semibold">{rp(i.qty * i.cost)}</div>
                  <div
                    className="text-[11.5px]"
                    style={{
                      color:
                        delta > 0
                          ? "var(--er)"
                          : delta < 0
                            ? "var(--ok)"
                            : "var(--mu)",
                    }}
                  >
                    {delta === 0
                      ? "harga sama"
                      : `${delta > 0 ? "naik" : "turun"} ${rp(Math.abs(delta))}`}
                  </div>
                </div>
              </div>
            );
          })}

          {p && (
            <div className="sdtot">
              <span>Total nota</span>
              <span className="num">{rp(purchaseTotal(p))}</span>
            </div>
          )}
        </div>

        <div className="text-[13px] px-1">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Tanggal nota</span>
            <b style={{ color: "var(--nv)" }}>{formatDate(p?.date)}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Total harga sebelumnya</span>
            <b style={{ color: "var(--nv)" }}>{rp(Number(a.before))}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Diajukan</span>
            <b style={{ color: "var(--nv)" }}>{a.user}</b>
          </div>
        </div>
      </Drawer>
    );
  }

  /* ---------------- Harga & biaya invoice ---------------- */
  if (a.kind === "sale") {
    const sale = db.sales.find((s) => s.id === a.saleId);
    const rev = a.revision;
    return (
      <Drawer
        open={Boolean(approvalId)}
        onClose={onClose}
        title="Detail perubahan invoice"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        }
      >
        <div className="sdtop">
          <div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {sale?.id ?? a.saleId}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {sale?.customer ?? "-"}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">✎</span>
            <span>Harga jual per unit</span>
          </div>
          {rev?.items.map((it, idx) => {
            const before = sale?.items[idx];
            const changed = before && before.price !== it.price;
            return (
              <div
                key={it.vid}
                className="flex justify-between gap-3 py-2 border-b"
                style={{ borderColor: "var(--ln)" }}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[13.5px]" style={{ color: "var(--nv)" }}>
                    {variantLabel(db, it.vid)}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--mu)" }}>
                    {it.qty} unit · modal {rp(it.cost)}/unit
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="num font-semibold">
                    {before && changed ? (
                      <>
                        <s style={{ color: "var(--mu)" }}>{rp(before.price)}</s>{" "}
                        <span style={{ color: "var(--nv)" }}>{rp(it.price)}</span>
                      </>
                    ) : (
                      <span style={{ color: "var(--nv)" }}>{rp(it.price)}</span>
                    )}
                  </div>
                  <div
                    className="text-[11.5px]"
                    style={{
                      color: itemProfit(it) >= 0 ? "var(--ok)" : "var(--er)",
                    }}
                  >
                    laba {rp(itemProfit(it))}/unit
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🚚</span>
            <span>Biaya operasional</span>
          </div>
          {[
            { label: "Ekspedisi / ongkir", was: sale?.ship ?? 0, now: rev?.ship ?? 0 },
            { label: "Packing", was: sale?.pack ?? 0, now: rev?.pack ?? 0 },
            { label: "Biaya lain", was: sale?.other ?? 0, now: rev?.other ?? 0 },
          ].map((c) => (
            <div key={c.label} className="flex justify-between py-1.5 text-[13px]">
              <span style={{ color: "var(--mu)" }}>{c.label}</span>
              <span className="num">
                {c.was !== c.now ? (
                  <>
                    <s style={{ color: "var(--mu)" }}>{rp(c.was)}</s>{" "}
                    <b style={{ color: "var(--nv)" }}>{rp(c.now)}</b>
                  </>
                ) : (
                  <span style={{ color: "var(--mu)" }}>{rp(c.now)}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">↗</span>
            <span>Laba order</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13px]">
            <span style={{ color: "var(--mu)" }}>Sebelum</span>
            <span className="num">{rp(Number(a.before))}</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13px]">
            <span style={{ color: "var(--mu)" }}>Setelah perubahan</span>
            <b className="num" style={{ color: "var(--nv)" }}>
              {rp(Number(a.after))}
            </b>
          </div>
        </div>
      </Drawer>
    );
  }

  return null;
}
