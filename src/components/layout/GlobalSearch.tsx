"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { rp } from "@/lib/format";
import { saleTotal } from "@/lib/calc";

type Hit = {
  key: string;
  href: string;
  kind: string;
  title: string;
  sub: string;
};

/** Pencarian cepat: invoice, pelanggan, dan produk. Ctrl/Cmd + K untuk fokus. */
export function GlobalSearch() {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const key = q.trim().toLowerCase();
    if (key.length < 2) return [];
    const out: Hit[] = [];

    db.sales
      .filter(
        (s) =>
          s.id.toLowerCase().includes(key) ||
          s.customer.toLowerCase().includes(key),
      )
      .slice(0, 4)
      .forEach((s) =>
        out.push({
          key: `s-${s.id}`,
          href: "/sales",
          kind: "Invoice",
          title: s.id,
          sub: `${s.customer} · ${rp(saleTotal(s))}`,
        }),
      );

    db.customers
      .filter((c) => c.name.toLowerCase().includes(key))
      .slice(0, 2)
      .forEach((c) =>
        out.push({
          key: `c-${c.id}`,
          href: "/customers",
          kind: "Pelanggan",
          title: c.name,
          sub: `${c.type}${c.phone ? ` · ${c.phone}` : ""}`,
        }),
      );

    db.products
      .filter((p) => p.name.toLowerCase().includes(key))
      .slice(0, 2)
      .forEach((p) =>
        out.push({
          key: `p-${p.id}`,
          href: "/stock",
          kind: "Produk",
          title: p.name,
          sub: p.cat,
        }),
      );

    return out.slice(0, 7);
  }, [q, db]);

  const show = open && q.trim().length >= 2;

  return (
    <div className="tb-search" ref={boxRef}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari produk, invoice, pelanggan..."
        aria-label="Pencarian cepat"
        role="combobox"
        aria-expanded={show}
        aria-controls="tb-res"
      />
      <kbd className="tb-kbd">CTRL K</kbd>

      {show && (
        <div className="tb-res" id="tb-res" role="listbox">
          {hits.length === 0 ? (
            <div className="tb-empty">
              Tidak ada hasil untuk &ldquo;{q.trim()}&rdquo;.
            </div>
          ) : (
            hits.map((h) => (
              <Link
                key={h.key}
                href={h.href}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="tb-res-k">{h.kind}</span>
                <span className="flex-1 min-w-0">
                  <span className="tb-res-t block truncate">{h.title}</span>
                  <span className="tb-res-s block truncate">{h.sub}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
