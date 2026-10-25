/**
 * Ekspor tabel ke file yang bisa dibuka Excel (.csv dengan separator ";"
 * dan BOM UTF-8 supaya karakter Indonesia terbaca rapi).
 *
 * Baris `sep=;` di awal file memberi tahu Excel agar memakai ";" sebagai
 * pemisah kolom, apa pun setting regional komputernya. Tanpa ini Excel
 * dengan locale "," menaruh seluruh baris di kolom A.
 */
const SEP = ";";

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(SEP)).join("\r\n");
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  // BOM UTF-8 + deklarasi separator, keduanya dibaca Excel saat file dibuka.
  const csv = `\uFEFFsep=${SEP}\r\n${toCsv(headers, rows)}`;
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
