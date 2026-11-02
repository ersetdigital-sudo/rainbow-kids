/**
 * Generator ID berurutan: `PREFIX-<nomor>`.
 *
 * Nomor diambil dari ID terbesar yang sudah ada, bukan dari jumlah data,
 * supaya nomor tidak bentrok setelah ada data yang dihapus.
 */
export function nextId(
  ids: string[],
  prefix: string,
  pad = 3,
  offset = 0,
): string {
  let max = 0;
  for (const id of ids) {
    const n = Number(id.slice(id.lastIndexOf("-") + 1));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1 + offset).padStart(pad, "0")}`;
}

/** Kode bulan (YYMM) dari tanggal "YYYY-MM-DD" — dipakai di nomor invoice. */
export function monthCode(date: string): string {
  return `${date.slice(2, 4)}${date.slice(5, 7)}`;
}
