import { opnameDiff } from "./calc";
import type { Opname, OpnameLine, Product } from "./types";

/** Satu baris hasil pembandingan hitung fisik dengan stok sistem saat ini. */
export type OpnameComparisonRow = {
  vid: string;
  /** "Nama produk · nama varian" (atau id varian bila produk sudah tidak ada). */
  label: string;
  cost: number;
  /** Stok sistem terkini dari tabel produk. */
  sys: number;
  /** Stok fisik hasil hitung; "" = belum dihitung. */
  phys: number | "";
  counted: boolean;
  /** Fisik − sistem; 0 bila belum dihitung. */
  diff: number;
  /** Nilai selisih menurut harga modal. */
  value: number;
  note: string;
};

export type OpnameComparison = {
  rows: OpnameComparisonRow[];
  /** Baris yang sudah diisi fisiknya. */
  counted: number;
  /** Baris yang belum dihitung. */
  pending: number;
  /** Baris yang sudah dihitung dan sesuai dengan sistem. */
  matched: number;
  /** Baris dengan selisih (fisik ≠ sistem). */
  diffRows: OpnameComparisonRow[];
  /** Total barang lebih (fisik > sistem). */
  plusQty: number;
  /** Total barang kurang (fisik < sistem). */
  minusQty: number;
  /** Nilai selisih (modal): negatif = rugi. */
  diffValue: number;
  /** Baris selisih yang belum diberi penyebab. */
  missingNote: number;
  /** Semua selisih sudah punya penyebab sehingga siap diajukan. */
  ready: boolean;
};

/**
 * Proses data inputan hasil hitung fisik lalu bandingkan dengan stok terkini
 * dari tabel produk (bukan snapshot saat sesi dibuat), sehingga selisih yang
 * dipakai untuk penyesuaian selalu sesuai kondisi stok terakhir.
 */
export function compareOpname(
  products: Product[],
  lines: OpnameLine[],
): OpnameComparison {
  const lookup = new Map<string, { label: string; cost: number; stock: number }>();
  for (const p of products) {
    for (const v of p.variants) {
      lookup.set(v.id, {
        label: `${p.name} · ${v.name}`,
        cost: v.cost,
        stock: v.stock,
      });
    }
  }

  const rows: OpnameComparisonRow[] = lines.map((l) => {
    const variant = lookup.get(l.vid);
    // Varian yang sudah tidak ada di tabel produk memakai stok snapshot.
    const sys = variant ? variant.stock : l.sys;
    const counted = l.phys !== "";
    const diff = opnameDiff({ sys, phys: l.phys });
    const cost = variant?.cost ?? 0;
    return {
      vid: l.vid,
      label: variant?.label ?? l.vid,
      cost,
      sys,
      phys: l.phys,
      counted,
      diff,
      value: diff * cost,
      note: l.note,
    };
  });

  const diffRows = rows.filter((r) => r.counted && r.diff !== 0);

  return {
    rows,
    counted: rows.filter((r) => r.counted).length,
    pending: rows.filter((r) => !r.counted).length,
    matched: rows.filter((r) => r.counted && r.diff === 0).length,
    diffRows,
    plusQty: diffRows.filter((r) => r.diff > 0).reduce((a, r) => a + r.diff, 0),
    minusQty: diffRows.filter((r) => r.diff < 0).reduce((a, r) => a - r.diff, 0),
    diffValue: diffRows.reduce((a, r) => a + r.value, 0),
    missingNote: diffRows.filter((r) => !r.note).length,
    ready: diffRows.every((r) => Boolean(r.note)),
  };
}

/**
 * Ringkasan selisih untuk daftar opname. Sesi Draft/Menunggu dibandingkan
 * dengan stok terkini di tabel produk; sesi yang sudah diputuskan memakai
 * angka yang tersimpan sebagai catatan historis.
 */
export function opnameSummary(products: Product[], o: Opname) {
  if (o.status === "Draft" || o.status === "Menunggu") {
    const cmp = compareOpname(products, o.lines);
    return { live: true, diffCount: cmp.diffRows.length, diffValue: cmp.diffValue };
  }
  const costByVid = new Map<string, number>();
  for (const p of products) {
    for (const v of p.variants) costByVid.set(v.id, v.cost);
  }
  const diffLines = o.lines.filter((l) => l.phys !== "" && l.phys !== l.sys);
  return {
    live: false,
    diffCount: diffLines.length,
    diffValue: diffLines.reduce(
      (a, l) => a + opnameDiff(l) * (costByVid.get(l.vid) ?? 0),
      0,
    ),
  };
}
