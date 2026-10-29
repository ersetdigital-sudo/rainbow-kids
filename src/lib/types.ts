export type Role = "Owner" | "Admin" | "Approver" | "User";

export type ModuleKey =
  | "dash"
  | "sales"
  | "stock"
  | "purch"
  | "opname"
  | "ar"
  | "report"
  | "approval"
  | "users";

export type Variant = {
  id: string;
  name: string;
  stock: number;
  cost: number;
  /** Harga jual standar (acuan). Harga aktual ditentukan saat transaksi. */
  price: number;
};

export type Product = {
  id: string;
  cat: string;
  name: string;
  /** Rentang harga jual yang berlaku untuk produk ini. */
  minPrice: number;
  maxPrice: number;
  variants: Variant[];
};

export type CustomerType = "Toko" | "Reseller" | "Ritel";

export type CustomerStatus = "Menunggu" | "Aktif" | "Diarsipkan";

export type Customer = {
  id: string;
  name: string;
  type: CustomerType;
  phone?: string;
  address?: string;
  /** Rekening tujuan transfer khusus toko ini (tampil di invoice). */
  bank?: string;
  /** Opsional; data lama tanpa status dianggap "Aktif". */
  status?: CustomerStatus;
};

export type Supplier = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
};

export type SaleItem = {
  vid: string;
  qty: number;
  price: number;
  cost: number;
};

export type PaymentStatus = "Diajukan" | "Disetujui" | "Ditolak";

export type Payment = {
  date: string;
  amt: number;
  method: string;
  /**
   * "Diajukan" = pengajuan pelunasan/pembayaran yang menunggu approval Owner.
   * Tidak dihitung sebagai pembayaran yang sudah berlaku.
   */
  status?: PaymentStatus;
  /** ID approval yang menjadi acuan pengajuan ini. */
  ref?: string;
};

export type SaleType = "tunai" | "tempo";

export type Sale = {
  id: string;
  date: string;
  customer: string;
  customerId?: string;
  type: SaleType;
  due: string | null;
  items: SaleItem[];
  ship: number;
  pack: number;
  other: number;
  note?: string;
  payments: Payment[];
};

export type PurchaseItem = {
  vid: string;
  qty: number;
  cost: number;
};

export type PurchasePayStatus = "Lunas" | "Belum Lunas" | "Menunggu Lunas";

export type Purchase = {
  id: string;
  nota: string;
  supplier: string;
  date: string;
  items: PurchaseItem[];
  payStatus: PurchasePayStatus;
};

export type HistoryEntry = {
  vid: string;
  date: string;
  type: "Stok" | "Harga" | "Nama" | "Pembayaran";
  desc: string;
  user: string;
};

export type ApprovalField = "name" | "cost" | "price" | "minPrice" | "maxPrice";

export type ApprovalKind =
  | "variant"
  | "payment"
  | "purchase"
  | "sale"
  | "nota"
  | "notaEdit"
  | "invoice"
  | "customer"
  | "customerDelete"
  | "saleDelete";

/** Ringkasan tunggakan toko saat invoice diajukan. */
export type SaleOverdueSummary = {
  count: number;
  total: number;
  ids: string[];
};

/** Usulan invoice penjualan baru — baru tercatat setelah disetujui Owner. */
export type SaleRequest = {
  customer: string;
  customerId?: string;
  date: string;
  type: SaleType;
  due: string | null;
  items: SaleItem[];
  ship: number;
  pack: number;
  other: number;
  paid: number;
  overdue?: SaleOverdueSummary;
};

/** Usulan perubahan harga jual / biaya sebuah invoice. */
export type SaleRevision = {
  items: SaleItem[];
  ship: number;
  pack: number;
  other: number;
};

/** Usulan nota belanja supplier — baru tercatat setelah disetujui Owner. */
export type PurchaseRequest = {
  supplier: string;
  nota: string;
  date: string;
  items: PurchaseItem[];
};

/** Selisih harga beli sebuah barang pada nota pembelian. */
export type CostChange = {
  vid: string;
  before: number;
  after: number;
};

export type Approval = {
  id: string;
  /**
   * variant = ubah data varian/produk, payment = pelunasan invoice,
   * purchase = status bayar pembelian, sale = harga & biaya invoice,
   * nota = izin belanja satu nota supplier,
   * notaEdit = revisi satu nota belanja yang sudah tercatat.
   */
  kind: ApprovalKind;
  type: string;
  vid?: string;
  field?: ApprovalField;
  before: string | number;
  after: string | number;
  saleId?: string;
  purchaseId?: string;
  /** Toko terkait approval kind "customer" / "customerDelete". */
  customerId?: string;
  customerName?: string;
  /** Alasan pengajuan hapus toko / order. */
  reason?: string;
  /** Snapshot penjualan saat pengajuan hapus order. */
  saleSnapshot?: Sale;
  /** Catatan keputusan otomatis, mis. "Order dihapus". */
  note?: string;
  /** Rincian usulan untuk kind "sale". */
  revision?: SaleRevision;
  /** Rincian invoice baru untuk kind "invoice". */
  saleRequest?: SaleRequest;
  /** Perubahan harga beli untuk kind "nota". */
  costChanges?: CostChange[];
  /** Rincian nota baru untuk kind "nota" (izin belanja). */
  purchaseRequest?: PurchaseRequest;
  user: string;
  time: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  by?: string;
  /** Waktu keputusan Owner/Approver ("YYYY-MM-DD HH:mm"). */
  decidedAt?: string;
  ref?: string;
};

export type OpnameLine = {
  vid: string;
  sys: number;
  phys: number | "";
  note: string;
};

export type OpnameStatus = "Draft" | "Menunggu" | "Disetujui" | "Ditolak";

export type Opname = {
  id: string;
  date: string;
  status: OpnameStatus;
  lines: OpnameLine[];
  sub?: string;
  by?: string;
  /** Waktu pengajuan ke Owner ("YYYY-MM-DD HH:mm"). */
  submittedAt?: string;
  /** Waktu keputusan Owner/Approver ("YYYY-MM-DD HH:mm"). */
  decidedAt?: string;
};

export type Expense = {
  date: string;
  cat: string;
  amt: number;
};

export type AppUser = {
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type Biz = {
  name: string;
  addr: string;
  phone: string;
  email: string;
  npwp: string;
  bank: string;
};

export type DB = {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  history: HistoryEntry[];
  approvals: Approval[];
  opnames: Opname[];
  expenses: Expense[];
  users: AppUser[];
  perms: Record<Role, Record<ModuleKey, string>>;
  biz: Biz;
  user: string;
};

export type ArStatus =
  | "Lunas"
  | "Terlambat"
  | "Jatuh tempo"
  | "Belum jatuh tempo"
  | "Menunggu Pelunasan";

/** Posisi tagihan ringkas: sudah lunas, belum lunas, atau belum jatuh tempo. */
export type PaymentPosition = "Lunas" | "Belum Lunas" | "Belum Jatuh Tempo";
