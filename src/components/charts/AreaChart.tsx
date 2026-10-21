"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { rp } from "@/lib/format";

export function AreaChart({
  days,
  values,
}: {
  days: string[];
  values: number[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 700;
  const H = 220;
  const pl = 46;
  const pr = 10;
  const pt = 14;
  const pb = 28;
  const mx = Math.ceil(Math.max(...values, 1) / 1e6) * 1e6 || 1e6;

  const x = (i: number) => pl + (i * (W - pl - pr)) / (values.length - 1);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx);

  const pts = values.map((v, i) => [x(i), y(v)] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const area = `${d} L${x(values.length - 1)},${H - pb} L${pl},${H - pb} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const gy = y(mx * t);
    return (
      <g key={t}>
        <line
          x1={pl}
          x2={W - pr}
          y1={gy}
          y2={gy}
          stroke="#EEF0F6"
          strokeDasharray="4 4"
        />
        <text
          x={pl - 8}
          y={gy + 4}
          textAnchor="end"
          fontSize="10"
          fill="#697386"
        >
          {(mx * t) / 1e6} jt
        </text>
      </g>
    );
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ overflow: "visible" }}
        role="img"
        aria-label="Grafik penjualan 14 hari terakhir"
      >
        <defs>
          <linearGradient id="rkArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FEC40B" stopOpacity=".35" />
            <stop offset="1" stopColor="#FEC40B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rkLine" x1="0" x2="1">
            <stop offset="0" stopColor="#04123F" />
            <stop offset="1" stopColor="#04123F" />
          </linearGradient>
        </defs>
        {grid}
        <path d={area} fill="url(#rkArea)" />
        <path
          d={d}
          fill="none"
          stroke="url(#rkLine)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <g
            key={i}
            className="pt"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <line
              x1={p[0]}
              x2={p[0]}
              y1={pt}
              y2={H - pb}
              className="vl"
              stroke="#04123F"
              strokeDasharray="3 3"
            />
            <circle cx={p[0]} cy={p[1]} r="14" fill="transparent" />
            <circle
              cx={p[0]}
              cy={p[1]}
              r="3.5"
              fill="#FEC40B"
              stroke="#04123F"
              strokeWidth="2"
            />
          </g>
        ))}
        {days.map((day, i) => (
          <text
            key={day + i}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#697386"
          >
            {day.slice(8)}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="ctip"
          style={{
            left: `${(pts[hover][0] / W) * 100}%`,
            top: `${(pts[hover][1] / H) * 100}%`,
            opacity: 1,
          }}
        >
          <div className="text-[11px] opacity-70">{formatDate(days[hover])}</div>
          <div className="font-bold num">{rp(values[hover])}</div>
        </div>
      )}
    </div>
  );
}
