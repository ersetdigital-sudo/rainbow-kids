"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { KPI_ICONS, type KpiIcon } from "./Kpi";

/**
 * Kartu metrik dashboard: masuk dengan stagger, angka menghitung naik,
 * dan kartu terangkat saat di-hover.
 */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "#04123F",
  tint = "#E6EAF4",
  trend,
  count,
  format,
  delay = 0,
  featured = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: KpiIcon;
  accent?: string;
  tint?: string;
  trend?: number | null;
  /** Nilai angka untuk animasi hitung naik. */
  count?: number;
  /** Format angka selama animasi berjalan. */
  format?: (n: number) => string;
  delay?: number;
  /** Kartu utama dengan latar gradien biru. */
  featured?: boolean;
}) {
  const [shown, setShown] = useState<number | null>(
    count === undefined ? null : 0,
  );

  useEffect(() => {
    if (count === undefined) return;
    let raf = 0;
    const dur = 750;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(count * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  const display = shown !== null && format ? format(shown) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`kpi2${featured ? " kpi2-f" : ""}`}
      style={{ ["--kc" as string]: accent, ["--kt" as string]: tint }}
    >
      <span className="kpi2-orb" aria-hidden="true" />

      <div className="kpi2-top">
        {icon ? (
          <span className="kpi2-ic">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: KPI_ICONS[icon] }}
            />
          </span>
        ) : (
          <span />
        )}
        {trend !== undefined && trend !== null && (
          <span className={`trend ${trend >= 0 ? "up" : "dn"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="kpi2-l">{label}</div>
      <div className="kpi2-v num">{display}</div>
      {sub && <div className="kpi2-sub">{sub}</div>}

      <motion.span
        className="kpi2-bar"
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.15, ease: "easeOut" }}
      />
    </motion.div>
  );
}
