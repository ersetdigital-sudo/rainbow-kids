"use client";

import { rp } from "@/lib/format";

export function ColumnBars({
  labels,
  omzet,
  laba,
}: {
  labels: string[];
  omzet: number[];
  laba: number[];
}) {
  const mx = Math.max(...omzet, 1);

  return (
    <>
      <div className="cb">
        {omzet.map((v, i) => (
          <div
            key={i}
            className="cbc"
            title={`${labels[i]}: omzet ${rp(v)} · laba ${rp(laba[i] ?? 0)}`}
          >
            <div className="cbb" style={{ height: `${(v / mx) * 100}%` }}>
              <div
                className="cbl"
                style={{ height: `${v ? ((laba[i] ?? 0) / v) * 100 : 0}%` }}
              />
            </div>
            <div className="cbx">{labels[i]?.slice(0, 2)}</div>
          </div>
        ))}
      </div>
      <div
        className="flex gap-4 text-[11.5px] mt-3"
        style={{ color: "var(--mu)" }}
      >
        <span className="flex items-center gap-1.5">
          <i className="lg" style={{ background: "#04123F" }} />
          Omzet
        </span>
        <span className="flex items-center gap-1.5">
          <i className="lg" style={{ background: "#FEC40B" }} />
          Laba
        </span>
      </div>
    </>
  );
}

export function HBarList({
  rows,
  color = "#04123F",
}: {
  rows: [string, number][];
  color?: string;
}) {
  const mx = Math.max(...rows.map((r) => r[1]), 1);

  return (
    <>
      {rows.map((r, i) => (
        <div className="hb" key={r[0] + i}>
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="font-medium">{r[0]}</span>
            <span className="num font-semibold">{rp(r[1])}</span>
          </div>
          <div className="hbt">
            <div
              style={{
                width: `${(r[1] / mx) * 100}%`,
                background: i === 0 ? "#FEC40B" : color,
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
