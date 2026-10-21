"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV } from "@/lib/nav";
import { Icon } from "@/components/ui/Icon";

export function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav id="bnav">
      {BOTTOM_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isActive(item.href) ? "on" : undefined}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
      <button type="button" onClick={onMenu} aria-label="Menu">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
      </button>
    </nav>
  );
}
