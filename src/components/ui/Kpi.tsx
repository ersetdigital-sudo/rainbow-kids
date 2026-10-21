"use client";

import { motion } from "motion/react";

const KPI_ICONS = {
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  spark: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
};

export type KpiIcon = keyof typeof KPI_ICONS;

export function Kpi({
  label,
  value,
  sub,
  icon,
  color = "#04123F",
  bg = "#E6EAF4",
  trend,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: KpiIcon;
  color?: string;
  bg?: string;
  trend?: number | null;
  highlight?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="card kpi kx p-4 md:p-5"
      style={{ ["--kc" as string]: color }}
    >
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <div
            className="w-10 h-10 rounded-xl grid place-items-center flex-none"
            style={{ background: bg, color }}
          >
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
          </div>
        ) : (
          <div />
        )}
        {trend !== undefined && trend !== null && (
          <span className={`trend ${trend >= 0 ? "up" : "dn"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="l mt-3">{label}</div>
      <div className="v num">{value}</div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--mu)" }}>
          {sub}
          {highlight && (
            <>
              {" · "}
              <span style={{ color: "var(--tx)" }}>{highlight}</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
