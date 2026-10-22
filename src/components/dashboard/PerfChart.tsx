"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";

function compact(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)} jt`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} rb`;
  return `${Math.round(n)}`;
}

/** Grafik batang penjualan harian dengan tooltip saat kartu batang disorot. */
export function PerfChart({
  days,
  values,
}: {
  days: string[];
  values: number[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = 250;
  const pl = 46;
  const pr = 6;
  const pt = 16;
  const pb = 30;

  const n = values.length;
  const raw = Math.max(...values, 1);
  const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
  const mx = Math.ceil((raw * 1.12) / mag) * mag || 1;

  const slot = (W - pl - pr) / n;
  const bw = Math.min(26, slot * 0.58);
  const bottom = H - pb;
  const y = (v: number) => pt + (bottom - pt) * (1 - v / mx);

  const bar = (cx: number, v: number) => {
    const x = cx - bw / 2;
    const h = Math.max(bottom - y(v), 3);
    const top = bottom - h;
    const r = Math.min(bw / 2, h / 2);
    return `M${x},${bottom} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${bottom} Z`;
  };

  const step = Math.ceil(n / 7);
  const tipW = 150;
  const tipH = 48;
  const tipX = Math.min(
    Math.max(pl + slot * ((hover ?? 0) + 0.5) - tipW / 2, 4),
    W - tipW - 4,
  );
  const tipY = Math.max(y(values[hover ?? 0] ?? 0) - tipH - 10, 0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Grafik penjualan harian"
    >
      <defs>
        <linearGradient id="perf-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#407bff" />
          <stop offset="100%" stopColor="#b3c8ff" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={pl}
            x2={W - pr}
            y1={y(mx * t)}
            y2={y(mx * t)}
            stroke="#eef0f5"
            strokeDasharray="4 5"
          />
          <text
            x={pl - 8}
            y={y(mx * t) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#71717a"
          >
            {compact(mx * t)}
          </text>
        </g>
      ))}

      {values.map((v, i) => {
        const cx = pl + slot * (i + 0.5);
        return (
          <g
            key={days[i]}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <rect
              x={cx - slot / 2}
              y={pt}
              width={slot}
              height={bottom - pt}
              fill="transparent"
            />
            <path
              d={bar(cx, v)}
              fill={hover === i ? "#2463ff" : "url(#perf-bar)"}
              style={{ transition: "fill .15s ease" }}
            />
          </g>
        );
      })}

      {days.map((d, i) =>
        i % step === 0 ? (
          <text
            key={d}
            x={pl + slot * (i + 0.5)}
            y={H - 9}
            textAnchor="middle"
            fontSize="10"
            fill="#71717a"
          >
            {d.slice(8)}
          </text>
        ) : null,
      )}

      {hover !== null && (
        <g pointerEvents="none">
          <rect
            x={tipX}
            y={tipY}
            width={tipW}
            height={tipH}
            rx="11"
            fill="#111111"
          />
          <text x={tipX + 13} y={tipY + 19} fontSize="10.5" fill="#a1a1aa">
            {formatDate(days[hover])}
          </text>
          <text
            x={tipX + 13}
            y={tipY + 36}
            fontSize="12.5"
            fontWeight="700"
            fill="#ffffff"
          >
            {rp(values[hover])}
          </text>
        </g>
      )}
    </svg>
  );
}
