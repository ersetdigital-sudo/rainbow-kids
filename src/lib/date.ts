/**
 * Tanggal acuan demo. Di HTML asli nilainya hardcode ('2026-10-20')
 * supaya data simulasi selalu konsisten. Ubah di sini bila perlu
 * memakai tanggal hari ini (date-hidup).
 */
export const TODAY = "2026-10-20";

/** Waktu lokal saat ini dalam format "YYYY-MM-DD HH:mm". */
export function nowStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  // Format manual (bukan toISOString) supaya tanggal tetap sesuai zona waktu lokal.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(date?: string | null): string {
  if (!date) return "-";
  return new Date(`${date}T00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function dayLabel(date: string): string {
  return new Date(`${date}T00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
