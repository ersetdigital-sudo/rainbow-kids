"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * `usePathname` hanya tersedia saat runtime untuk route dinamis,
 * jadi komponen yang memakainya dibungkus Suspense agar route tetap
 * bisa di-prerender (Cache Components).
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] pb-24 lg:pb-8"
    >
      {children}
    </motion.main>
  );
}

function SidebarFallback() {
  return <aside className="side" aria-hidden="true" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar open={open} onClose={() => setOpen(false)} />
      </Suspense>
      <div className="main">
        <Topbar onMenu={() => setOpen(true)} />
        <Suspense
          fallback={<div className="px-4 md:px-8 py-6 md:py-8" aria-hidden="true" />}
        >
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <BottomNav onMenu={() => setOpen(true)} />
      </Suspense>
    </>
  );
}
