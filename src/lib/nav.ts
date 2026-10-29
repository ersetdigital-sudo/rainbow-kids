export type IconName =
  | "hist"
  | "dash"
  | "sales"
  | "cust"
  | "stock"
  | "purch"
  | "opname"
  | "ar"
  | "report"
  | "approval"
  | "invoice"
  | "users"
  | "settings";

export const ICONS: Record<IconName, string> = {
  hist: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  sales: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
  cust: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M5 16c.4-1.5 1.5-2.5 3-2.5s2.6 1 3 2.5M14 9h5M14 13h5"/>',
  stock: '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  purch: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  opname: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  ar: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  report: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
  approval: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>',
  invoice: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { heading: string } | { items: NavItem[] };

export const NAV: NavGroup[] = [
  { heading: "Utama" },
  {
    items: [
      { href: "/", label: "Dashboard", icon: "dash" },
      { href: "/sales", label: "Penjualan", icon: "sales" },
      { href: "/customers", label: "Data Toko", icon: "cust" },
      { href: "/ar", label: "Piutang & Pembayaran", icon: "ar" },
      { href: "/invoice", label: "Invoice", icon: "invoice" },
    ],
  },
  { heading: "Persediaan" },
  {
    items: [
      { href: "/stock", label: "Produk & Stok", icon: "stock" },
      { href: "/purchases", label: "Pembelian Supplier", icon: "purch" },
      { href: "/opname", label: "Stok Opname", icon: "opname" },
    ],
  },
  { heading: "Kontrol" },
  {
    items: [
      { href: "/reports", label: "Laporan", icon: "report" },
      { href: "/history", label: "Histori", icon: "hist" },
      { href: "/approvals", label: "Approval & Audit", icon: "approval" },
      { href: "/users", label: "Pengguna & Akses", icon: "users" },
      { href: "/settings", label: "Pengaturan Toko", icon: "settings" },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Beranda", icon: "dash" },
  { href: "/sales", label: "Penjualan", icon: "sales" },
  { href: "/stock", label: "Stok", icon: "stock" },
  { href: "/ar", label: "Piutang", icon: "ar" },
];
