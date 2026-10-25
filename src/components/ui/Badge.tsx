import type { ArStatus } from "@/lib/types";

const STATUS_CLASS: Record<string, string> = {
  Lunas: "b-ok",
  Terlambat: "b-er",
  "Jatuh tempo": "b-wa",
  "Belum jatuh tempo": "b-in",
  "Belum Jatuh Tempo": "b-in",
  "Menunggu Pelunasan": "b-wa",
  Menunggu: "b-wa",
  "Menunggu Lunas": "b-wa",
  "Belum Lunas": "b-er",
  Disetujui: "b-ok",
  Ditolak: "b-er",
  Draft: "b-in",
  Tempo: "b-in",
  Tunai: "b-ac",
  Minus: "b-er",
};

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: ArStatus | string;
}) {
  const cls = (tone && STATUS_CLASS[tone]) || "b-in";
  return <span className={`bd ${cls}`}>{children}</span>;
}
