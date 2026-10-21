"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { TODAY } from "./date";
import { uid } from "./format";
import { priceRange, salePaid, saleProposed, saleTotal } from "./calc";
import {
  getServerSnapshot,
  getSnapshot,
  resetSnapshot,
  setSnapshot,
  subscribe,
} from "./persist";
import type {
  ApprovalField,
  Customer,
  CustomerType,
  DB,
  ModuleKey,
  OpnameLine,
  Role,
  Sale,
  Supplier,
} from "./types";

export type SaleDraft = {
  customer: string;
  customerId?: string;
  date: string;
  type: "tunai" | "tempo";
  due: string;
  items: { vid: string; qty: number; price: number }[];
  ship: number;
  pack: number;
  other: number;
  paid: number;
};

export type PurchaseDraft = {
  supplier: string;
  nota: string;
  date: string;
  items: { vid: string; qty: number; cost: number }[];
};

export type VariantInput = {
  name: string;
  stock: number;
  cost: number;
  price: number;
};

export type Result = {
  ok: boolean;
  msg: string;
  /** Peringatan non-blocking, mis. stok jadi minus. */
  warnings?: string[];
  /** Data yang baru dibuat (pelanggan/supplier baru). */
  customer?: Customer;
  supplier?: Supplier;
};

const PERM_LEVELS = ["Tidak", "Lihat", "Input", "Ajukan", "Penuh", "Setujui"];

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      2400,
    );
  }, []);

  const resetDemo = useCallback(() => {
    resetSnapshot();
    toast("Data demo direset");
  }, [toast]);

  /* ---------------- Pelanggan & supplier ---------------- */

  const addCustomer = useCallback<StoreValue["addCustomer"]>(
    (c) => {
      const name = c.name.trim();
      if (!name) return { ok: false, msg: "Isi nama pelanggan" };
      const exists = getSnapshot().customers.some(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) return { ok: false, msg: "Pelanggan dengan nama itu sudah ada" };
      const customer: Customer = { id: uid("c"), name, type: c.type };
      setSnapshot((prev) => ({ ...prev, customers: [...prev.customers, customer] }));
      return { ok: true, msg: `Pelanggan ${name} ditambahkan`, customer };
    },
    [],
  );

  const addSupplier = useCallback<StoreValue["addSupplier"]>(
    (s) => {
      const name = s.name.trim();
      if (!name) return { ok: false, msg: "Isi nama supplier" };
      const exists = getSnapshot().suppliers.some(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) return { ok: false, msg: "Supplier dengan nama itu sudah ada" };
      const supplier: Supplier = { id: uid("s"), name };
      setSnapshot((prev) => ({ ...prev, suppliers: [...prev.suppliers, supplier] }));
      return { ok: true, msg: `Supplier ${name} ditambahkan`, supplier };
    },
    [],
  );

  /* ---------------- Penjualan ---------------- */

  const saveSale = useCallback((draft: SaleDraft): Result => {
    const current = getSnapshot();
    if (!draft.customer.trim())
      return { ok: false, msg: "Isi nama pelanggan dulu" };

    // Harga jual harus berada di dalam rentang harga produk.
    for (const i of draft.items) {
      const r = priceRange(current, i.vid);
      if (r && (i.price < r.min || i.price > r.max)) {
        const v = current.products
          .flatMap((p) => p.variants)
          .find((x) => x.id === i.vid);
        return {
          ok: false,
          msg: `Harga ${v?.name ?? "produk"} di luar rentang yang berlaku`,
        };
      }
    }

    const id = `INV-2610-${String(current.sales.length + 1).padStart(4, "0")}`;
    const items = draft.items.map((i) => {
      const v = current.products
        .flatMap((p) => p.variants)
        .find((x) => x.id === i.vid)!;
      return { vid: i.vid, qty: i.qty, price: i.price, cost: v.cost };
    });
    const sale: Sale = {
      id,
      date: draft.date,
      customer: draft.customer.trim(),
      customerId: draft.customerId,
      type: draft.type,
      due: draft.type === "tempo" ? draft.due : null,
      items,
      ship: draft.ship,
      pack: draft.pack,
      other: draft.other,
      note: "",
      payments: [],
    };
    if (sale.type === "tunai")
      sale.payments.push({
        date: sale.date,
        amt: saleTotal(sale),
        method: "Tunai",
        status: "Disetujui",
      });
    else if (draft.paid > 0)
      sale.payments.push({
        date: sale.date,
        amt: draft.paid,
        method: "Transfer",
        status: "Disetujui",
      });

    // Peringatan stok minus (penjualan tetap dicatat, stok jadi minus).
    const warnings: string[] = [];
    for (const item of sale.items) {
      const v = current.products
        .flatMap((p) => p.variants)
        .find((x) => x.id === item.vid)!;
      const next = v.stock - item.qty;
      if (next < 0)
        warnings.push(
          `${v.name} (${current.products.find((p) => p.id === v.id)?.name}): stok ${v.stock} → ${next} (minus, perlu restock)`,
        );
    }

    setSnapshot((prev) => ({
      ...prev,
      sales: [...prev.sales, sale],
      products: prev.products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const item = sale.items.find((i) => i.vid === v.id);
          return item ? { ...v, stock: v.stock - item.qty } : v;
        }),
      })),
      history: [
        ...prev.history,
        ...sale.items.map((i) => ({
          vid: i.vid,
          date: sale.date,
          type: "Stok" as const,
          desc: `Penjualan ${sale.id} −${i.qty}`,
          user: prev.user,
        })),
      ],
    }));
    return {
      ok: true,
      msg: `Transaksi ${id} tersimpan (simulasi)`,
      warnings,
    };
  }, []);

  /**
   * Pembayaran sebagian langsung berlaku. Pelunasan (mencakup sisa tagihan)
   * harus berupa pengajuan yang disetujui Owner.
   */
  const recordPayment = useCallback<StoreValue["recordPayment"]>(
    (saleId, p) => {
      const current = getSnapshot();
      const sale = current.sales.find((s) => s.id === saleId);
      if (!sale) return { ok: false, msg: "Invoice tidak ditemukan" };
      const rem = saleTotal(sale) - salePaid(sale);
      if (p.amt <= 0) return { ok: false, msg: "Jumlah tidak valid" };
      if (rem <= 0) return { ok: false, msg: "Invoice ini sudah lunas" };

      const time = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`;

      if (p.amt >= rem) {
        if (saleProposed(sale) >= rem)
          return {
            ok: false,
            msg: "Sudah ada pengajuan pelunasan yang menunggu approval Owner",
          };
        const approvalId = `AP-${String(current.approvals.length + 1).padStart(3, "0")}`;
        setSnapshot((prev) => ({
          ...prev,
          sales: prev.sales.map((s) =>
            s.id === saleId
              ? {
                  ...s,
                  payments: [
                    ...s.payments,
                    {
                      date: p.date,
                      amt: rem,
                      method: p.method,
                      status: "Diajukan" as const,
                      ref: approvalId,
                    },
                  ],
                }
              : s,
          ),
          approvals: [
            ...prev.approvals,
            {
              id: approvalId,
              kind: "payment" as const,
              type: "Pelunasan invoice",
              saleId,
              before: rem,
              after: p.amt,
              user: prev.user,
              time,
              status: "Menunggu" as const,
            },
          ],
        }));
        return {
          ok: true,
          msg: "Pengajuan pelunasan dikirim ke Owner untuk approval",
        };
      }

      setSnapshot((prev) => ({
        ...prev,
        sales: prev.sales.map((s) =>
          s.id === saleId
            ? {
                ...s,
                payments: [
                  ...s.payments,
                  {
                    date: p.date,
                    amt: p.amt,
                    method: p.method,
                    status: "Disetujui" as const,
                  },
                ],
              }
            : s,
        ),
      }));
      return { ok: true, msg: "Pembayaran dicatat" };
    },
    [],
  );

  /* ---------------- Produk ---------------- */

  const addProduct = useCallback<StoreValue["addProduct"]>(
    (p) => {
      if (!p.cat.trim() || !p.name.trim())
        return { ok: false, msg: "Isi kategori dan nama produk" };
      if (!p.variants.length) return { ok: false, msg: "Minimal satu varian" };
      if (p.minPrice > p.maxPrice)
        return { ok: false, msg: "Harga jual minimum harus lebih kecil dari maksimum" };
      setSnapshot((prev) => ({
        ...prev,
        products: [
          ...prev.products,
          {
            id: uid("p"),
            cat: p.cat.trim(),
            name: p.name.trim(),
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            variants: p.variants.map((v) => ({ id: uid("v"), ...v })),
          },
        ],
      }));
      return { ok: true, msg: "Produk ditambahkan" };
    },
    [],
  );

  /** Pengajuan ubah nama varian / harga modal / rentang harga jual. */
  const submitChange = useCallback<StoreValue["submitChange"]>(
    (vid, changes) => {
      const current = getSnapshot();
      const product = current.products.find((p) =>
        p.variants.some((v) => v.id === vid),
      );
      const variant = product?.variants.find((v) => v.id === vid);
      if (!product || !variant)
        return { ok: false, msg: "Varian tidak ditemukan" };

      const list: {
        field: ApprovalField;
        type: string;
        before: string | number;
        after: string | number;
      }[] = [];
      if (changes.name !== undefined && changes.name !== variant.name)
        list.push({
          field: "name",
          type: "Nama varian",
          before: variant.name,
          after: changes.name,
        });
      if (changes.cost !== undefined && changes.cost !== variant.cost)
        list.push({
          field: "cost",
          type: "Harga modal",
          before: variant.cost,
          after: changes.cost,
        });
      if (changes.minPrice !== undefined && changes.minPrice !== product.minPrice)
        list.push({
          field: "minPrice",
          type: "Harga jual minimum",
          before: product.minPrice,
          after: changes.minPrice,
        });
      if (changes.maxPrice !== undefined && changes.maxPrice !== product.maxPrice)
        list.push({
          field: "maxPrice",
          type: "Harga jual maksimum",
          before: product.maxPrice,
          after: changes.maxPrice,
        });
      if (!list.length) return { ok: false, msg: "Tidak ada perubahan" };

      const time = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`;
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          ...list.map((c, idx) => ({
            id: `AP-${String(prev.approvals.length + 1 + idx).padStart(3, "0")}`,
            kind: "variant" as const,
            type: c.type,
            vid,
            field: c.field,
            before: c.before,
            after: c.after,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          })),
        ],
      }));
      return {
        ok: true,
        msg: `${list.length} perubahan dikirim ke approval`,
      };
    },
    [],
  );

  /* ---------------- Pembelian supplier ---------------- */

  const savePurchase = useCallback<StoreValue["savePurchase"]>(
    (draft) => {
      const current = getSnapshot();
      if (!draft.supplier.trim() || !draft.nota.trim())
        return { ok: false, msg: "Isi supplier dan no. nota" };
      const id = `PB-${String(current.purchases.length + 1).padStart(3, "0")}`;
      const time = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`;

      setSnapshot((prev) => {
        const approvals = [...prev.approvals];
        for (const item of draft.items) {
          const product = prev.products.find((p) =>
            p.variants.some((v) => v.id === item.vid),
          );
          const variant = product?.variants.find((v) => v.id === item.vid);
          if (variant && variant.cost !== item.cost) {
            approvals.push({
              id: `AP-${String(approvals.length + 1).padStart(3, "0")}`,
              kind: "variant" as const,
              type: "Harga modal",
              vid: item.vid,
              field: "cost" as const,
              before: variant.cost,
              after: item.cost,
              user: prev.user,
              time,
              status: "Menunggu" as const,
              ref: id,
            });
          }
        }
        return {
          ...prev,
          approvals,
          purchases: [
            ...prev.purchases,
            {
              id,
              nota: draft.nota.trim(),
              supplier: draft.supplier.trim(),
              date: draft.date,
              items: draft.items.map((i) => ({ ...i })),
              payStatus: "Belum Lunas" as const,
            },
          ],
          products: prev.products.map((p) => ({
            ...p,
            variants: p.variants.map((v) => {
              const item = draft.items.find((i) => i.vid === v.id);
              return item ? { ...v, stock: v.stock + item.qty } : v;
            }),
          })),
          history: [
            ...prev.history,
            ...draft.items.map((i) => ({
              vid: i.vid,
              date: draft.date,
              type: "Stok" as const,
              desc: `Pembelian ${id} (${draft.nota}) +${i.qty}`,
              user: prev.user,
            })),
          ],
        };
      });
      return {
        ok: true,
        msg: `Pembelian ${id} tersimpan, stok bertambah`,
      };
    },
    [],
  );

  /** Pengajuan pelunasan pembelian — baru berlaku setelah disetujui Owner. */
  const requestPurchaseLunas = useCallback<StoreValue["requestPurchaseLunas"]>(
    (purchaseId) => {
      const current = getSnapshot();
      const p = current.purchases.find((x) => x.id === purchaseId);
      if (!p) return { ok: false, msg: "Pembelian tidak ditemukan" };
      if (p.payStatus === "Lunas")
        return { ok: false, msg: "Pembelian ini sudah lunas" };
      if (p.payStatus === "Menunggu Lunas")
        return { ok: false, msg: "Sudah ada pengajuan yang menunggu approval" };
      const time = `${TODAY} ${new Date().toTimeString().slice(0, 5)}`;
      setSnapshot((prev) => ({
        ...prev,
        purchases: prev.purchases.map((x) =>
          x.id === purchaseId ? { ...x, payStatus: "Menunggu Lunas" } : x,
        ),
        approvals: [
          ...prev.approvals,
          {
            id: `AP-${String(prev.approvals.length + 1).padStart(3, "0")}`,
            kind: "purchase" as const,
            type: "Status pembayaran pembelian",
            purchaseId,
            before: "Belum Lunas",
            after: "Lunas",
            user: prev.user,
            time,
            status: "Menunggu" as const,
            ref: purchaseId,
          },
        ],
      }));
      return { ok: true, msg: "Pengajuan pelunasan dikirim ke Owner" };
    },
    [],
  );

  /* ---------------- Stok opname ---------------- */

  const startOpname = useCallback(() => {
    const current = getSnapshot();
    const id = `SO-${String(current.opnames.length + 1).padStart(3, "0")}`;
    const lines: OpnameLine[] = current.products.flatMap((p) =>
      p.variants.map((v) => ({ vid: v.id, sys: v.stock, phys: "", note: "" })),
    );
    setSnapshot((prev) => ({
      ...prev,
      opnames: [...prev.opnames, { id, date: TODAY, status: "Draft", lines }],
    }));
    return id;
  }, []);

  const updateOpnameLine = useCallback<StoreValue["updateOpnameLine"]>(
    (id, index, patch) => {
      setSnapshot((prev) => ({
        ...prev,
        opnames: prev.opnames.map((o) =>
          o.id === id
            ? {
                ...o,
                lines: o.lines.map((l, i) =>
                  i === index ? { ...l, ...patch } : l,
                ),
              }
            : o,
        ),
      }));
    },
    [],
  );

  const submitOpname = useCallback<StoreValue["submitOpname"]>(
    (id) => {
      const o = getSnapshot().opnames.find((x) => x.id === id);
      if (!o) return { ok: false, msg: "Sesi opname tidak ditemukan" };
      const missing = o.lines.some(
        (l) => l.phys !== "" && l.phys !== l.sys && !l.note,
      );
      if (missing)
        return { ok: false, msg: "Isi penyebab untuk setiap selisih" };
      setSnapshot((prev) => ({
        ...prev,
        opnames: prev.opnames.map((x) =>
          x.id === id
            ? { ...x, status: "Menunggu" as const, sub: prev.user }
            : x,
        ),
      }));
      return { ok: true, msg: "Opname diajukan ke Owner" };
    },
    [],
  );

  const decideOpname = useCallback<StoreValue["decideOpname"]>((id, ok) => {
    setSnapshot((prev) => {
      const o = prev.opnames.find((x) => x.id === id);
      if (!o) return prev;
      const history = [...prev.history];
      const products = prev.products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const line = o.lines.find((l) => l.vid === v.id);
          if (!ok || !line || line.phys === "" || line.phys === line.sys)
            return v;
          const d = line.phys - line.sys;
          history.push({
            vid: v.id,
            date: TODAY,
            type: "Stok" as const,
            desc: `Stok opname ${o.id}: ${d > 0 ? "+" : ""}${d} (${line.note})`,
            user: prev.user,
          });
          return { ...v, stock: v.stock + d };
        }),
      }));
      return {
        ...prev,
        products,
        history,
        opnames: prev.opnames.map((x) =>
          x.id === id
            ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user }
            : x,
        ),
      };
    });
  }, []);

  /* ---------------- Approval ---------------- */

  const decideApproval = useCallback<StoreValue["decideApproval"]>((id, ok) => {
    setSnapshot((prev) => {
      const a = prev.approvals.find((x) => x.id === id);
      if (!a) return prev;

      // 1. Pelunasan invoice
      if (a.kind === "payment") {
        return {
          ...prev,
          sales: prev.sales.map((s) =>
            s.id === a.saleId
              ? {
                  ...s,
                  payments: s.payments.map((p) =>
                    p.status === "Diajukan" && p.ref === a.id
                      ? { ...p, status: ok ? ("Disetujui" as const) : ("Ditolak" as const) }
                      : p,
                  ),
                }
              : s,
          ),
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user }
              : x,
          ),
        };
      }

      // 2. Status pembayaran pembelian
      if (a.kind === "purchase") {
        return {
          ...prev,
          purchases: prev.purchases.map((p) =>
            p.id === a.purchaseId
              ? { ...p, payStatus: ok ? ("Lunas" as const) : ("Belum Lunas" as const) }
              : p,
          ),
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user }
              : x,
          ),
        };
      }

      // 3. Ubah data varian / rentang harga produk
      const history = [...prev.history];
      const products = prev.products.map((p) => {
        const variant = p.variants.find((v) => v.id === a.vid);
        if (!variant) return p;

        // Perubahan level produk (rentang harga jual).
        if (a.field === "minPrice" || a.field === "maxPrice") {
          if (!ok) return p;
          const value = Number(a.after);
          history.push({
            vid: variant.id,
            date: TODAY,
            type: "Harga" as const,
            desc: `${a.type}: ${Number(a.before).toLocaleString("id-ID")} → ${value.toLocaleString("id-ID")}`,
            user: prev.user,
          });
          return a.field === "minPrice"
            ? { ...p, minPrice: value }
            : { ...p, maxPrice: value };
        }

        if (!ok) return p;
        const before =
          a.field === "name"
            ? String(a.before)
            : `Rp ${Number(a.before).toLocaleString("id-ID")}`;
        const after =
          a.field === "name"
            ? String(a.after)
            : `Rp ${Number(a.after).toLocaleString("id-ID")}`;
        history.push({
          vid: variant.id,
          date: TODAY,
          type: a.field === "name" ? ("Nama" as const) : ("Harga" as const),
          desc: `${a.type}: ${before} → ${after}`,
          user: prev.user,
        });
        if (a.field === "name") return { ...p, variants: p.variants.map((v) => (v.id === a.vid ? { ...v, name: String(a.after) } : v)) };
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.id === a.vid
              ? ({ ...v, [a.field!]: Number(a.after) } as typeof v)
              : v,
          ),
        };
      });

      return {
        ...prev,
        products,
        history,
        approvals: prev.approvals.map((x) =>
          x.id === id
            ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user }
            : x,
        ),
      };
    });
  }, []);

  /* ---------------- Pengguna ---------------- */

  const setUserRole = useCallback<StoreValue["setUserRole"]>((index, role) => {
    setSnapshot((prev) => ({
      ...prev,
      users: prev.users.map((u, i) => (i === index ? { ...u, role } : u)),
    }));
  }, []);

  const toggleUser = useCallback<StoreValue["toggleUser"]>((index) => {
    setSnapshot((prev) => ({
      ...prev,
      users: prev.users.map((u, i) =>
        i === index ? { ...u, active: !u.active } : u,
      ),
    }));
  }, []);

  const inviteUser = useCallback<StoreValue["inviteUser"]>((u) => {
    if (!u.name.trim()) return { ok: false, msg: "Isi nama" };
    setSnapshot((prev) => ({
      ...prev,
      users: [...prev.users, { ...u, name: u.name.trim(), active: true }],
    }));
    return { ok: true, msg: "Undangan disimulasikan" };
  }, []);

  const cyclePerm = useCallback<StoreValue["cyclePerm"]>((role, module) => {
    setSnapshot((prev) => {
      const current = prev.perms[role][module];
      const next =
        PERM_LEVELS[(PERM_LEVELS.indexOf(current) + 1) % PERM_LEVELS.length];
      return {
        ...prev,
        perms: {
          ...prev.perms,
          [role]: { ...prev.perms[role], [module]: next },
        },
      };
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      db,
      toast,
      resetDemo,
      addCustomer,
      addSupplier,
      saveSale,
      recordPayment,
      addProduct,
      submitChange,
      savePurchase,
      requestPurchaseLunas,
      startOpname,
      updateOpnameLine,
      submitOpname,
      decideOpname,
      decideApproval,
      setUserRole,
      toggleUser,
      inviteUser,
      cyclePerm,
    }),
    [
      db,
      toast,
      resetDemo,
      addCustomer,
      addSupplier,
      saveSale,
      recordPayment,
      addProduct,
      submitChange,
      savePurchase,
      requestPurchaseLunas,
      startOpname,
      updateOpnameLine,
      submitOpname,
      decideOpname,
      decideApproval,
      setUserRole,
      toggleUser,
      inviteUser,
      cyclePerm,
    ],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="tdot">✓</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

type StoreValue = {
  db: DB;
  toast: (msg: string) => void;
  resetDemo: () => void;
  addCustomer: (c: {
    name: string;
    type: CustomerType;
    phone?: string;
    address?: string;
  }) => Result;
  addSupplier: (s: { name: string; phone?: string; address?: string }) => Result;
  saveSale: (draft: SaleDraft) => Result;
  recordPayment: (
    saleId: string,
    p: { date: string; amt: number; method: string },
  ) => Result;
  addProduct: (p: {
    cat: string;
    name: string;
    minPrice: number;
    maxPrice: number;
    variants: VariantInput[];
  }) => Result;
  submitChange: (
    vid: string,
    changes: {
      name?: string;
      cost?: number;
      minPrice?: number;
      maxPrice?: number;
    },
  ) => Result;
  savePurchase: (draft: PurchaseDraft) => Result;
  requestPurchaseLunas: (purchaseId: string) => Result;
  startOpname: () => string;
  updateOpnameLine: (
    id: string,
    index: number,
    patch: Partial<OpnameLine>,
  ) => void;
  submitOpname: (id: string) => Result;
  decideOpname: (id: string, ok: boolean) => void;
  decideApproval: (id: string, ok: boolean) => void;
  setUserRole: (index: number, role: Role) => void;
  toggleUser: (index: number) => void;
  inviteUser: (u: { name: string; email: string; role: Role }) => Result;
  cyclePerm: (role: Role, module: ModuleKey) => void;
};

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}
