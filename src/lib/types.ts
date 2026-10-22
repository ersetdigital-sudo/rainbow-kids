export type Role = "Owner" | "Admin" | "Staff";

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

export type Customer = {
  id: string;
  name: string;
  type: CustomerType;
  phone?: string;
  address?: string;
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
  | "nota";

/** Usulan perubahan harga jual / biaya sebuah invoice. */
export type SaleRevision = {
  items: SaleItem[];
  ship: number;
  pack: number;
  other: number;
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
   * nota = izin belanja satu nota supplier.
   */
  kind: ApprovalKind;
  type: string;
  vid?: string;
  field?: ApprovalField;
  before: string | number;
  after: string | number;
  saleId?: string;
  purchaseId?: string;
  /** Rincian usulan untuk kind "sale". */
  revision?: SaleRevision;
  /** Perubahan harga beli untuk kind "nota". */
  costChanges?: CostChange[];
  user: string;
  time: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  by?: string;
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
