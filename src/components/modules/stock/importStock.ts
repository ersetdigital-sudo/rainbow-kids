import type { ImportProductRow } from "@/lib/store";

/** Kolom yang dipakai: kategori, nama produk, varian, stok, modal, harga jual. */
const HEADERS = ["Kategori", "Nama", "Varian", "Stok", "Modal", "Harga"];

const DELIMS = [";", ",", "\t"];

function cells(line: string, delim: string): string[] {
  return line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim());
}

function toNumber(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Baca CSV/Excel (disimpan sebagai CSV) hasil ekspor template. Baris pertama
 * boleh berupa judul kolom; urutan kolom mengikuti HEADERS.
 */
export function parseStockCsv(text: string): {
  rows: ImportProductRow[];
  skipped: number;
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^sep=/.test(l));
  if (!lines.length) return { rows: [], skipped: 0 };

  const delim = DELIMS.find((d) => lines[0].includes(d)) ?? ";";
  const first = cells(lines[0], delim).map((c) => c.toLowerCase());
  const hasHeader = HEADERS.some((h) => first.includes(h.toLowerCase()));
  const body = hasHeader ? lines.slice(1) : lines;

  const rows: ImportProductRow[] = [];
  let skipped = 0;
  for (const line of body) {
    const c = cells(line, delim);
    const row: ImportProductRow = {
      cat: c[0] ?? "",
      name: c[1] ?? "",
      variant: c[2] ?? "",
      stock: toNumber(c[3] ?? ""),
      cost: toNumber(c[4] ?? ""),
      price: toNumber(c[5] ?? ""),
    };
    if (!row.cat || !row.name) {
      skipped += 1;
      continue;
    }
    rows.push(row);
  }
  return { rows, skipped };
}

/** Isi berkas template impor produk. */
export const STOCK_TEMPLATE = [
  HEADERS,
  ["Sepatu", "Sepatu Anak LED", "28", "10", "85000", "135000"],
  ["Sepatu", "Sepatu Anak LED", "30", "6", "85000", "135000"],
];
