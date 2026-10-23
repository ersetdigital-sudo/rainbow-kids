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

  /* ---------------- Invoice penjualan baru ---------------- */
  if (a.kind === "invoice") {
    const req = a.saleRequest;
    if (!req) return null;
    const total = req.items.reduce((x, i) => x + i.qty * i.price, 0);
    const modal = req.items.reduce((x, i) => x + i.qty * i.cost, 0);
    const ops = (+req.ship || 0) + (+req.pack || 0) + (+req.other || 0);
    const profit = total - modal - ops;

    return (
      <Drawer
        open={Boolean(approvalId)}
        onClose={onClose}
        title="Detail invoice baru"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        }
      >
        <div className="sdtop">
          <div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {a.saleId ?? "Invoice baru"} · {formatDate(req.date)}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {req.customer}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🛍️</span>
            <span>Barang &amp; laba per unit</span>
            <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
              {req.items.length} jenis
            </span>
          </div>

          {req.items.map((i) => (
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
                  {i.qty} unit × {rp(i.price)} · modal {rp(i.cost)}/unit
                </div>
                <div
                  className="text-[12px]"
                  style={{
                    color: itemProfit(i) >= 0 ? "var(--ok)" : "var(--er)",
                  }}
                >
                  laba {rp(itemProfit(i))}/unit · total baris{" "}
                  {rp(itemProfit(i) * i.qty)}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="num font-semibold" style={{ color: "var(--nv)" }}>
                  {rp(i.qty * i.price)}
                </div>
              </div>
            </div>
          ))}

          <div className="sdtot">
            <span>Total penjualan</span>
            <span className="num">{rp(total)}</span>
          </div>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🚚</span>
            <span>Biaya operasional</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13px]">
            <span style={{ color: "var(--mu)" }}>Ekspedisi / ongkir</span>
            <span className="num">{rp(req.ship)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13px]">
            <span style={{ color: "var(--mu)" }}>Packing</span>
            <span className="num">{rp(req.pack)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13px]">
            <span style={{ color: "var(--mu)" }}>Biaya lain</span>
            <span className="num">{rp(req.other)}</span>
          </div>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">↗</span>
            <span>Catatan laba</span>
          </div>
          <div className="text-[12.5px] space-y-1" style={{ color: "var(--mu)" }}>
            <p>
              Laba dihitung <b>per unit tiap jenis barang</b> (harga jual − modal),
              sebelum ongkir/packing. Barang dengan laba minus sudah ditandai merah
              di atas.
            </p>
            <p>
              Modal hanya tampil di layar internal ini dan tidak pernah dicetak pada
              invoice pelanggan.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t text-[13px]" style={{ borderColor: "var(--ln)" }}>
            <div className="flex justify-between py-1">
              <span style={{ color: "var(--mu)" }}>Total penjualan</span>
              <span className="num">{rp(total)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span style={{ color: "var(--mu)" }}>− Modal barang</span>
              <span className="num">{rp(modal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span style={{ color: "var(--mu)" }}>− Biaya operasional</span>
              <span className="num">{rp(ops)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Laba order</span>
              <b className="num" style={{ color: profit >= 0 ? "var(--ok)" : "var(--er)" }}>
                {rp(profit)}
              </b>
            </div>
          </div>
        </div>

        <div className="text-[13px] px-1">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Jenis pembayaran</span>
            <b style={{ color: "var(--nv)" }}>
              {req.type === "tempo"
                ? `Tempo · jatuh tempo ${formatDate(req.due)}`
                : "Tunai (lunas otomatis)"}
            </b>
          </div>
          {req.type === "tempo" && (
            <div className="flex justify-between py-1.5">
              <span style={{ color: "var(--mu)" }}>Uang muka</span>
              <b style={{ color: "var(--nv)" }}>{rp(req.paid)}</b>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Diajukan</span>
            <b style={{ color: "var(--nv)" }}>{a.user}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Waktu</span>
            <b style={{ color: "var(--nv)" }}>{a.time}</b>
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--wa)" }}>
            Transaksi, pengurangan stok, dan pembayaran baru tercatat setelah
            Owner menyetujui pengajuan ini.
          </div>
        </div>
      </Drawer>
    );
  }

  /* ---------------- Nota belanja supplier ---------------- */
  if (a.kind === "nota") {
    const p = db.purchases.find((x) => x.id === a.purchaseId);
    const req = a.purchaseRequest;
    // Nota baru belum punya record pembelian — pakai rincian pengajuannya.
    const items = req?.items ?? p?.items ?? [];
    const nota = req?.nota ?? p?.nota;
    const supplier = req?.supplier ?? p?.supplier ?? "-";
    const date = req?.date ?? p?.date;
    const total = items.reduce((x, i) => x + i.qty * i.cost, 0);
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
              {nota ? `Nota ${nota}` : "Nota"}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {supplier}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🧾</span>
            <span>Barang yang dibelanjakan</span>
            <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
              {items.length} jenis
            </span>
          </div>

          {items.map((i) => {
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

          {items.length > 0 && (
            <div className="sdtot">
              <span>Total nota</span>
              <span className="num">{rp(total)}</span>
            </div>
          )}
        </div>

        <div className="text-[13px] px-1">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Tanggal nota</span>
            <b style={{ color: "var(--nv)" }}>{formatDate(date)}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Total harga sebelumnya</span>
            <b style={{ color: "var(--nv)" }}>{rp(Number(a.before))}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Diajukan</span>
            <b style={{ color: "var(--nv)" }}>{a.user}</b>
          </div>
          {req && (
            <div className="text-[11.5px] mt-1" style={{ color: "var(--wa)" }}>
              Nota ini belum tercatat — pembelian, tambahan stok, dan harga modal
              baru berlaku setelah Owner menyetujui.
            </div>
          )}
        </div>
      </Drawer>
    );
  }

  /* ---------------- Pelunasan pembelian supplier ---------------- */
  if (a.kind === "purchase") {
    const p = db.purchases.find((x) => x.id === a.purchaseId);
    const items = p?.items ?? [];
    const total = p ? purchaseTotal(p) : 0;
    const qty = items.reduce((x, i) => x + i.qty, 0);
    return (
      <Drawer
        open={Boolean(approvalId)}
        onClose={onClose}
        title="Detail pelunasan nota"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        }
      >
        <div className="sdtop">
          <div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {p ? `${p.id} · nota ${p.nota}` : (a.purchaseId ?? "-")}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {p?.supplier ?? "-"}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sim mb-3">
          Cocokkan <b>no. nota</b>, <b>tanggal</b>, dan <b>total</b> di bawah ini
          dengan nota fisik supplier sebelum menyetujui, supaya transaksi bernilai
          mirip tidak terbayar dua kali.
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🧾</span>
            <span>Nota yang akan dilunasi</span>
            <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
              {items.length} jenis
            </span>
          </div>

          {items.map((i) => (
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
                  {i.qty} × {rp(i.cost)}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="num font-semibold">{rp(i.qty * i.cost)}</div>
              </div>
            </div>
          ))}

          <div className="sdtot">
            <span>Total nota</span>
            <span className="num">{rp(total)}</span>
          </div>
        </div>

        <div className="text-[13px] px-1">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Tanggal pembelian</span>
            <b style={{ color: "var(--nv)" }}>{formatDate(p?.date ?? "")}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Total unit</span>
            <b style={{ color: "var(--nv)" }}>{qty} unit</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Status sekarang</span>
            <b style={{ color: "var(--nv)" }}>{p?.payStatus ?? "-"}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Setelah disetujui</span>
            <b style={{ color: "var(--nv)" }}>Lunas</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Diajukan</span>
            <b style={{ color: "var(--nv)" }}>{a.user}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Waktu</span>
            <b style={{ color: "var(--nv)" }}>{a.time}</b>
          </div>
        </div>
      </Drawer>
    );
  }

  /* ---------------- Revisi nota belanja ---------------- */
  if (a.kind === "notaEdit") {
    const p = db.purchases.find((x) => x.id === a.purchaseId);
    const req = a.purchaseRequest;
    const next = req?.items ?? [];
    const vids = [
      ...new Set([...(p?.items ?? []).map((i) => i.vid), ...next.map((i) => i.vid)]),
    ];
    return (
      <Drawer
        open={Boolean(approvalId)}
        onClose={onClose}
        title="Detail revisi nota belanja"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        }
      >
        <div className="sdtop">
          <div>
            <div className="text-xs" style={{ color: "var(--mu)" }}>
              {p ? `${p.id} · nota ${p.nota}` : (a.purchaseId ?? "-")}
            </div>
            <div className="font-extrabold text-lg" style={{ color: "var(--nv)" }}>
              {req?.supplier ?? p?.supplier ?? "-"}
            </div>
          </div>
          <Badge tone={a.status}>{a.status}</Badge>
        </div>

        <div className="sdc">
          <div className="sdh">
            <span className="sdi">🧾</span>
            <span>Perubahan barang</span>
            <span className="ml-auto font-semibold" style={{ color: "var(--nv)" }}>
              {next.length} jenis
            </span>
          </div>

          {vids.map((vid) => {
            const was = p?.items.find((i) => i.vid === vid);
            const now = next.find((i) => i.vid === vid);
            const qtyChanged = (was?.qty ?? 0) !== (now?.qty ?? 0);
            const costChanged = was ? now && +now.cost !== +was.cost : Boolean(now);
            return (
              <div
                key={vid}
                className="flex justify-between gap-3 py-2 border-b"
                style={{ borderColor: "var(--ln)" }}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[13.5px]" style={{ color: "var(--nv)" }}>
                    {variantLabel(db, vid)}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--mu)" }}>
                    qty{" "}
                    <b style={{ color: qtyChanged ? "var(--nv)" : "var(--mu)" }}>
                      {was?.qty ?? 0} → {now?.qty ?? 0}
                    </b>{" "}
                    · harga{" "}
                    <b style={{ color: costChanged ? "var(--nv)" : "var(--mu)" }}>
                      {rp(was?.cost ?? 0)} → {rp(now?.cost ?? 0)}
                    </b>
                  </div>
                  {!now && (
                    <div className="text-[11.5px]" style={{ color: "var(--er)" }}>
                      barang dibatalkan dari nota
                    </div>
                  )}
                  {!was && (
                    <div className="text-[11.5px]" style={{ color: "var(--ok)" }}>
                      barang baru ditambahkan
                    </div>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="num font-semibold">
                    {rp((now?.qty ?? 0) * (now?.cost ?? 0))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="sdtot">
            <span>Total nota baru</span>
            <span className="num">{rp(Number(a.after))}</span>
          </div>
        </div>

        <div className="text-[13px] px-1">
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>No. nota</span>
            <b style={{ color: "var(--nv)" }}>
              {p?.nota ?? "-"} → {req?.nota ?? "-"}
            </b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Tanggal nota</span>
            <b style={{ color: "var(--nv)" }}>
              {formatDate(p?.date ?? "")} → {formatDate(req?.date ?? "")}
            </b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Supplier</span>
            <b style={{ color: "var(--nv)" }}>
              {p?.supplier ?? "-"} → {req?.supplier ?? "-"}
            </b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Total sebelumnya</span>
            <span className="num">{rp(Number(a.before))}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Diajukan</span>
            <b style={{ color: "var(--nv)" }}>{a.user}</b>
          </div>
          <div className="flex justify-between py-1.5">
            <span style={{ color: "var(--mu)" }}>Waktu</span>
            <b style={{ color: "var(--nv)" }}>{a.time}</b>
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--wa)" }}>
            Stok dan harga modal menyesuaikan selisih qty/harga di atas setelah
            Owner menyetujui revisi ini.
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
