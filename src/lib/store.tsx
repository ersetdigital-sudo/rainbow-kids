"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { roleOfSession, useAuth } from "./auth";
import { TODAY, nowStamp } from "./date";
import { fetchRemoteState, setRemoteErrorHandler } from "./remote";
import { uid } from "./format";
import { monthCode, nextId } from "./ids";
import { DEFAULT_PERMS, DEFAULT_PREFS, emptyDb } from "./workspace";
import {
  createAccount,
  fetchAccounts,
  patchAccount,
  removeAccount,
} from "./users";
import {
  customerStatus,
  overdueSales,
  purchaseTotal,
  saleBelongsToCustomer,
  salePaid,
  saleProfit,
  saleProposed,
  saleTotal,
} from "./calc";
import { compareOpname } from "./opname";
import {
  activateBrowserSnapshot,
  getServerSnapshot,
  getSnapshot,
  clearSnapshot,
  setSnapshot,
  subscribe,
} from "./persist";
import type {
  ApprovalField,
  AppUser,
  Biz,
  CostChange,
  Customer,
  CustomerChange,
  DB,
  ModuleKey,
  OpnameLine,
  Prefs,
  PurchaseRequest,
  Role,
  Sale,
  SaleItem,
  SaleRequest,
  SaleRevision,
  SaleType,
  Supplier,
} from "./types";

export type SaleDraft = {
  customer: string;
  customerId?: string;
  date: string;
  /** Kosong = belum dipilih — transaksi tidak bisa diajukan. */
  type: SaleType | "";
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

export type ImportProductRow = {
  cat: string;
  name: string;
  variant: string;
  stock: number;
  cost: number;
  price: number;
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
  /** Data yang baru dibuat (toko/supplier baru). */
  customer?: Customer;
  supplier?: Supplier;
};

const PERM_LEVELS = ["Tidak", "Lihat", "Input", "Ajukan", "Penuh", "Setujui"];

/**
 * Apakah `db.user` (mis. "Budi (Owner)") merujuk ke pengguna ini.
 * Data lama menyimpan nama depan saja, jadi nama depan juga dicocokkan.
 */
function isActiveUser(current: string, user: AppUser): boolean {
  const value = current.trim().toLowerCase();
  const name = user.name.trim().toLowerCase();
  if (!value) return false;
  if (value === name || value === user.email.trim().toLowerCase()) return true;
  const suffix = `(${user.role.toLowerCase()})`;
  if (!value.endsWith(suffix)) return false;
  const label = value.slice(0, -suffix.length).trim();
  return label === name || label === name.split(/\s+/)[0];
}

function hasPendingSaleDelete(
  approvals: DB["approvals"],
  saleId: string,
): boolean {
  return approvals.some(
    (a) =>
      a.kind === "saleDelete" &&
      a.saleId === saleId &&
      a.status === "Menunggu",
  );
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const db = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { configured, ready, session, signOut } = useAuth();
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  // Akun yang datanya sudah selesai dibaca dari Supabase. Selama belum sama
  // dengan sesi aktif, UI menunggu supaya dashboard tidak tampil kosong dulu.
  const [loadedUser, setLoadedUser] = useState<string | null>(null);

  // Data tersimpan di browser baru dipakai setelah hydration selesai, supaya
  // markup server & client sama dan tidak memicu hydration mismatch.
  useEffect(() => {
    const timer = window.setTimeout(activateBrowserSnapshot, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Supabase aktif: setelah masuk, pakai data toko bersama dari server.
  // Daftar pengguna selalu diambil dari akun Supabase Auth, bukan dari kode.
  useEffect(() => {
    if (!configured || !ready || !session) return;
    let cancelled = false;
    Promise.all([fetchRemoteState(), fetchAccounts()]).then(
      ([res, accounts]) => {
        // Gagal baca (mis. supabase/schema.sql belum dijalankan): pakai data lokal.
        if (cancelled || !res.ok) return;

        const email = (session.user.email ?? "").trim();
        const meta = (session.user.user_metadata ?? {}) as { name?: string };
        const account = accounts?.find(
          (a) => a.email.toLowerCase() === email.toLowerCase(),
        );
        const name =
          (account?.name || meta.name || "").trim() ||
          email.split("@")[0] ||
          email;
        // Role dari app_metadata (fallback user_metadata untuk akun lama).
        const role = (account?.role ??
          roleOfSession(session.user) ??
          "User") as Role;

        setSnapshot(() => {
          // Baris kosong = toko baru: mulai dari ruang kerja kosong.
          const base = res.state ?? emptyDb();
          const users = accounts ?? base.users;
          const me = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase(),
          );
          return {
            ...base,
            // Akun login ini belum tercatat (mis. baris data dikosongkan).
            users: me ? users : [...users, { name, email, role, active: true }],
            user: `${(me ?? { name, role }).name} (${(me ?? { name, role }).role})`,
          };
        });
      },
    ).finally(() => {
      // Data toko siap (atau gagal dibaca → tetap pakai data lokal).
      if (!cancelled) setLoadedUser(session.user.id);
    });
    return () => {
      cancelled = true;
    };
  }, [configured, ready, session]);

  /** Dashboard baru boleh tampil setelah data toko akun ini selesai dimuat. */
  const storeReady =
    !configured || !session || loadedUser === session.user.id;

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      2400,
    );
  }, []);

  // Data asli tidak boleh hilang diam-diam: beri tahu bila penyimpanan ke
  // Simpan ke Supabase gagal (mis. supabase/schema.sql belum dijalankan).
  useEffect(() => {
    const seen = new Set<string>();
    setRemoteErrorHandler((msg) => {
      if (seen.has(msg)) return;
      seen.add(msg);
      toast("Gagal menyimpan ke Supabase — periksa supabase/schema.sql");
    });
    return () => setRemoteErrorHandler(null);
  }, [toast]);

  /** Hapus semua data supaya toko bisa mulai dengan data aslinya. */
  const clearData = useCallback(() => {
    clearSnapshot();
    toast("Semua data dikosongkan");
  }, [toast]);

  /* ---------------- Data toko ---------------- */

  /** Simpan identitas toko yang tercetak di kepala invoice. */
  const updateBiz = useCallback<StoreValue["updateBiz"]>(
    (patch) => {
      const name = patch.name.trim();
      const addr = patch.addr.trim();
      if (!name) return { ok: false, msg: "Isi nama toko" };
      if (!addr) return { ok: false, msg: "Isi alamat toko" };
      setSnapshot((prev) => ({
        ...prev,
        biz: {
          name,
          addr,
          phone: patch.phone.trim(),
          email: patch.email.trim(),
          npwp: patch.npwp.trim(),
          bank: patch.bank.trim(),
        },
      }));
      return { ok: true, msg: "Data toko disimpan" };
    },
    [],
  );

  /** Pengaturan operasional toko: identitas cetak, tempo, ambang stok, metode bayar. */
  const updatePrefs = useCallback<StoreValue["updatePrefs"]>(
    (patch) => {
      const methods = patch.methods.map((m) => m.trim()).filter(Boolean);
      if (!methods.length)
        return { ok: false, msg: "Isi minimal satu metode pembayaran" };
      if (!Number.isFinite(patch.dueDays) || patch.dueDays < 0)
        return { ok: false, msg: "Jatuh tempo harus berupa angka hari" };
      if (!Number.isFinite(patch.minStock) || patch.minStock < 0)
        return { ok: false, msg: "Ambang stok menipis harus berupa angka" };
      setSnapshot((prev) => ({
        ...prev,
        prefs: {
          ...prev.prefs,
          ...patch,
          methods,
          dueDays: Math.round(patch.dueDays),
          minStock: Math.round(patch.minStock),
        },
      }));
      return { ok: true, msg: "Pengaturan toko disimpan" };
    },
    [],
  );

  /* ---------------- Biaya operasional ---------------- */

  /** Catat pengeluaran di luar order (listrik, gaji, sewa, …). */
  const addExpense = useCallback<StoreValue["addExpense"]>(
    (e) => {
      const cat = e.cat.trim();
      if (!cat) return { ok: false, msg: "Isi kategori biaya" };
      if (!(e.amt > 0)) return { ok: false, msg: "Jumlah biaya harus lebih dari 0" };
      setSnapshot((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { date: e.date, cat, amt: e.amt }],
      }));
      return { ok: true, msg: "Biaya dicatat" };
    },
    [],
  );

  const updateExpense = useCallback<StoreValue["updateExpense"]>(
    (index, patch) => {
      const current = getSnapshot().expenses[index];
      if (!current) return { ok: false, msg: "Biaya tidak ditemukan" };
      const cat = (patch.cat ?? current.cat).trim();
      const amt = patch.amt ?? current.amt;
      if (!cat) return { ok: false, msg: "Isi kategori biaya" };
      if (!(amt > 0)) return { ok: false, msg: "Jumlah biaya harus lebih dari 0" };
      setSnapshot((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e, i) =>
          i === index ? { date: patch.date ?? e.date, cat, amt } : e,
        ),
      }));
      return { ok: true, msg: "Biaya diperbarui" };
    },
    [],
  );

  const removeExpense = useCallback<StoreValue["removeExpense"]>((index) => {
    if (!getSnapshot().expenses[index])
      return { ok: false, msg: "Biaya tidak ditemukan" };
    setSnapshot((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index),
    }));
    return { ok: true, msg: "Biaya dihapus" };
  }, []);

  /* ---------------- Cadangan data ---------------- */

  /** Pulihkan seluruh data toko dari berkas cadangan (akun login tidak diubah). */
  const restoreData = useCallback<StoreValue["restoreData"]>(
    (data) => {
      if (!data || !Array.isArray(data.products))
        return { ok: false, msg: "Berkas cadangan tidak dikenali" };
      setSnapshot((prev) => ({
        ...emptyDb(),
        ...data,
        users: prev.users,
        user: prev.user,
        prefs: { ...DEFAULT_PREFS, ...(data.prefs ?? {}) },
        perms: { ...DEFAULT_PERMS, ...(data.perms ?? {}) },
      }));
      return { ok: true, msg: "Data toko dipulihkan dari cadangan" };
    },
    [],
  );

  /* ---------------- Toko & supplier ---------------- */

  const addCustomer = useCallback<StoreValue["addCustomer"]>(
    (c) => {
      const name = c.name.trim();
      if (!name) return { ok: false, msg: "Isi nama toko" };
      const exists = getSnapshot().customers.some(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) return { ok: false, msg: "Toko dengan nama itu sudah ada" };
      const customer: Customer = {
        id: uid("c"),
        name,
        // Semua pelanggan tercatat sebagai toko; rekening tujuan transfer
        // diambil dari Pengaturan Toko, bukan per toko.
        type: "Toko",
        phone: c.phone?.trim() || undefined,
        address: c.address?.trim() || undefined,
        status: "Menunggu",
      };
      const time = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        customers: [...prev.customers, customer],
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "customer" as const,
            type: "Toko baru",
            before: "—",
            after: "Menunggu",
            customerId: customer.id,
            customerName: customer.name,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          },
        ],
      }));
      return {
        ok: true,
        msg: `Toko ${name} ditambahkan — menunggu approval Owner`,
        customer,
      };
    },
    [],
  );

  /**
   * Ajukan perubahan data toko (nama, HP, alamat). Data lama tetap dipakai
   * sampai Owner menyetujui pengajuan — pola yang sama dengan hapus toko.
   */
  const requestCustomerEdit = useCallback<StoreValue["requestCustomerEdit"]>(
    (id, patch) => {
      const name = patch.name.trim();
      if (!name) return { ok: false, msg: "Isi nama toko" };
      const current = getSnapshot();
      const customer = current.customers.find((c) => c.id === id);
      if (!customer) return { ok: false, msg: "Toko tidak ditemukan" };
      if (
        current.customers.some(
          (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return { ok: false, msg: "Toko dengan nama itu sudah ada" };
      if (
        current.approvals.some(
          (a) =>
            a.kind === "customerEdit" &&
            a.customerId === id &&
            a.status === "Menunggu",
        )
      )
        return {
          ok: false,
          msg: "Perubahan toko ini masih menunggu approval Owner",
        };

      const phone = patch.phone?.trim() ?? "";
      const address = patch.address?.trim() ?? "";
      const changes: CustomerChange[] = [];
      if (name !== customer.name)
        changes.push({ field: "name", before: customer.name, after: name });
      if (phone !== (customer.phone ?? ""))
        changes.push({
          field: "phone",
          before: customer.phone ?? "",
          after: phone,
        });
      if (address !== (customer.address ?? ""))
        changes.push({
          field: "address",
          before: customer.address ?? "",
          after: address,
        });
      if (!changes.length) return { ok: false, msg: "Tidak ada perubahan" };

      const time = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "customerEdit" as const,
            type: "Ubah data toko",
            before: customer.name,
            after: name,
            customerId: id,
            customerName: customer.name,
            customerChanges: changes,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          },
        ],
      }));
      return { ok: true, msg: "Pengajuan ubah data toko dikirim ke Owner" };
    },
    [],
  );

  /** Ajukan hapus toko; dieksekusi setelah disetujui Owner. */
  const requestCustomerDelete = useCallback<
    StoreValue["requestCustomerDelete"]
  >((customerId, reason) => {
    const note = reason.trim();
    if (!note) return { ok: false, msg: "Isi alasan hapus toko" };

    const current = getSnapshot();
    const customer = current.customers.find((c) => c.id === customerId);
    if (!customer) return { ok: false, msg: "Toko tidak ditemukan" };

    const outstanding = current.sales.some(
      (s) =>
        saleBelongsToCustomer(s, customer) &&
        saleTotal(s) - salePaid(s) > 0,
    );
    if (outstanding)
      return { ok: false, msg: "Toko masih punya tagihan belum lunas" };

    if (
      current.approvals.some(
        (a) =>
          a.kind === "customerDelete" &&
          a.customerId === customerId &&
          a.status === "Menunggu",
      )
    )
      return {
        ok: false,
        msg: "Sudah ada pengajuan hapus yang menunggu untuk toko ini",
      };

    const time = nowStamp();
    setSnapshot((prev) => ({
      ...prev,
      approvals: [
        ...prev.approvals,
        {
          id: nextId(prev.approvals.map((a) => a.id), "AP-"),
          kind: "customerDelete" as const,
          type: "Hapus toko",
          before: customerStatus(customer),
          after: "Dihapus",
          customerId,
          customerName: customer.name,
          reason: note,
          user: prev.user,
          time,
          status: "Menunggu" as const,
        },
      ],
    }));
    return { ok: true, msg: "Pengajuan hapus toko dikirim ke Owner" };
  }, []);

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

  /**
   * Transaksi baru tidak langsung tercatat — invoice diajukan ke Owner.
   * Penjualan, pengurangan stok, dan riwayat baru berlaku setelah disetujui.
   */
  const saveSale = useCallback((draft: SaleDraft): Result => {
    const current = getSnapshot();
    if (!draft.type)
      return { ok: false, msg: "Pilih jenis transaksi (COD atau Tempo)" };
    if (!draft.customer.trim())
      return { ok: false, msg: "Isi nama toko dulu" };
    if (!draft.items.length)
      return { ok: false, msg: "Tambahkan minimal satu barang" };

    const customer =
      (draft.customerId &&
        current.customers.find((c) => c.id === draft.customerId)) ||
      current.customers.find(
        (c) => c.name.toLowerCase() === draft.customer.trim().toLowerCase(),
      );
    if (customer && customerStatus(customer) === "Diarsipkan")
      return {
        ok: false,
        msg: "Toko sudah diarsipkan dan tidak bisa dipilih",
      };

    const overdue = overdueSales(current, {
      id: draft.customerId ?? customer?.id,
      name: draft.customer.trim(),
    });
    const overdueSummary = overdue.length
      ? {
          count: overdue.length,
          total: overdue.reduce(
            (sum, s) => sum + Math.max(saleTotal(s) - salePaid(s), 0),
            0,
          ),
          ids: overdue.map((s) => s.id),
        }
      : undefined;

    // Harga jual bebas diisi (rentang hanya jadi acuan/histori, tidak memblokir).
    const items: SaleItem[] = draft.items.map((i) => {
      const v = current.products
        .flatMap((p) => p.variants)
        .find((x) => x.id === i.vid)!;
      return { vid: i.vid, qty: i.qty, price: i.price, cost: v.cost };
    });
    const request: SaleRequest = {
      customer: draft.customer.trim(),
      customerId: draft.customerId,
      date: draft.date,
      type: draft.type,
      due: draft.type === "tempo" ? draft.due : null,
      items,
      ship: draft.ship,
      pack: draft.pack,
      other: draft.other,
      paid: draft.paid,
      overdue: overdueSummary,
    };

    // Peringatan stok minus dipakai sebagai catatan saat Owner meninjau.
    const warnings: string[] = [];
    for (const item of items) {
      const v = current.products
        .flatMap((p) => p.variants)
        .find((x) => x.id === item.vid)!;
      const next = v.stock - item.qty;
      if (next < 0)
        warnings.push(
          `${v.name} (${current.products.find((p) => p.id === v.id)?.name}): stok ${v.stock} → ${next} (minus setelah disetujui)`,
        );
    }

    const time = nowStamp();
    setSnapshot((prev) => ({
      ...prev,
      approvals: [
        ...prev.approvals,
        {
          id: nextId(prev.approvals.map((a) => a.id), "AP-"),
          kind: "invoice" as const,
          type: "Invoice penjualan baru",
          before: 0,
          after: items.reduce((a, i) => a + i.qty * i.price, 0),
          saleRequest: request,
          user: prev.user,
          time,
          status: "Menunggu" as const,
        },
      ],
    }));
    return {
      ok: true,
      msg: "Invoice diajukan — menunggu approval Owner",
      warnings,
    };
  }, []);

  /**
   * Pengajuan ubah harga jual per unit / biaya operasional sebuah invoice.
   * Baru berlaku setelah disetujui Owner.
   */
  const requestSaleRevision = useCallback<StoreValue["requestSaleRevision"]>(
    (saleId, revision) => {
      const current = getSnapshot();
      const sale = current.sales.find((s) => s.id === saleId);
      if (!sale) return { ok: false, msg: "Invoice tidak ditemukan" };
      if (hasPendingSaleDelete(current.approvals, saleId))
        return {
          ok: false,
          msg: "Pengajuan hapus order sedang menunggu approval",
        };
      if (
        current.approvals.some(
          (a) =>
            a.kind === "sale" && a.saleId === saleId && a.status === "Menunggu",
        )
      )
        return {
          ok: false,
          msg: "Sudah ada pengajuan perubahan yang menunggu approval Owner",
        };

      const sameItems =
        sale.items.length === revision.items.length &&
        sale.items.every((it, i) => {
          const next = revision.items[i];
          return (
            next &&
            next.vid === it.vid &&
            next.qty === it.qty &&
            +next.price === +it.price
          );
        });
      const sameOps =
        +sale.ship === +revision.ship &&
        +sale.pack === +revision.pack &&
        +sale.other === +revision.other;
      if (sameItems && sameOps) return { ok: false, msg: "Tidak ada perubahan" };

      const time = nowStamp();
      const after = saleProfit({ ...sale, ...revision });
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "sale" as const,
            type: "Harga & biaya invoice",
            saleId,
            before: saleProfit(sale),
            after,
            revision,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          },
        ],
      }));
      return {
        ok: true,
        msg: "Pengajuan perubahan dikirim ke Owner untuk approval",
      };
    },
    [],
  );

  /**
   * Pembayaran sebagian langsung berlaku. Pelunasan (mencakup sisa tagihan)
   * harus berupa pengajuan yang disetujui Owner.
   */
  const recordPayment = useCallback<StoreValue["recordPayment"]>(
    (saleId, p) => {
      const current = getSnapshot();
      const sale = current.sales.find((s) => s.id === saleId);
      if (!sale) return { ok: false, msg: "Invoice tidak ditemukan" };
      if (hasPendingSaleDelete(current.approvals, saleId))
        return {
          ok: false,
          msg: "Pengajuan hapus order sedang menunggu approval",
        };
      const rem = saleTotal(sale) - salePaid(sale);
      if (p.amt <= 0) return { ok: false, msg: "Jumlah tidak valid" };
      if (rem <= 0) return { ok: false, msg: "Invoice ini sudah lunas" };

      const time = nowStamp();

      if (p.amt >= rem) {
        if (saleProposed(sale) >= rem)
          return {
            ok: false,
            msg: "Sudah ada pengajuan pelunasan yang menunggu approval Owner",
          };
        const approvalId = nextId(
          current.approvals.map((a) => a.id),
          "AP-",
        );
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

  /** Ajukan hapus order penjualan; snapshot disimpan untuk audit. */
  const requestSaleDelete = useCallback<StoreValue["requestSaleDelete"]>(
    (saleId, reason) => {
      const note = reason.trim();
      if (!note) return { ok: false, msg: "Isi alasan hapus order" };

      const current = getSnapshot();
      const sale = current.sales.find((s) => s.id === saleId);
      if (!sale) return { ok: false, msg: "Penjualan tidak ditemukan" };
      if (hasPendingSaleDelete(current.approvals, saleId))
        return {
          ok: false,
          msg: "Sudah ada pengajuan hapus untuk order ini",
        };

      const snapshot: Sale = {
        ...sale,
        items: sale.items.map((i) => ({ ...i })),
        payments: sale.payments.map((p) => ({ ...p })),
      };
      const time = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "saleDelete" as const,
            type: "Hapus penjualan",
            saleId,
            before: saleTotal(sale),
            after: "Dihapus",
            saleSnapshot: snapshot,
            reason: note,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          },
        ],
      }));
      return { ok: true, msg: "Pengajuan hapus order dikirim ke Owner" };
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

  /**
   * Impor varian dari CSV/Excel. Satu baris = satu varian; baris dengan
   * kategori + nama produk yang sama digabung jadi satu produk.
   */
  const importProducts = useCallback<StoreValue["importProducts"]>((rows) => {
    const clean = rows.filter((r) => r.cat.trim() && r.name.trim());
    if (!clean.length)
      return { ok: false, msg: "Tidak ada baris valid (kategori & nama wajib)" };
    setSnapshot((prev) => {
      const products = prev.products.map((p) => ({
        ...p,
        variants: [...p.variants],
      }));
      for (const row of clean) {
        const cat = row.cat.trim();
        const name = row.name.trim();
        const price = row.price > 0 ? row.price : 0;
        let product = products.find((p) => p.cat === cat && p.name === name);
        if (!product) {
          product = {
            id: uid("p"),
            cat,
            name,
            minPrice: price,
            maxPrice: price,
            variants: [],
          };
          products.push(product);
        }
        product.minPrice = Math.min(product.minPrice || price, price);
        product.maxPrice = Math.max(product.maxPrice, price);
        const variantName = (row.variant || "Default").trim();
        const existing = product.variants.find(
          (v) => v.name.toLowerCase() === variantName.toLowerCase(),
        );
        if (existing) {
          existing.stock = row.stock;
          existing.cost = row.cost;
          existing.price = price;
        } else {
          product.variants.push({
            id: uid("v"),
            name: variantName,
            stock: row.stock,
            cost: row.cost,
            price,
          });
        }
      }
      return { ...prev, products };
    });
    return { ok: true, msg: `${clean.length} varian diimpor` };
  }, []);

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

      const time = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          ...list.map((c, idx) => ({
            id: nextId(
              prev.approvals.map((a) => a.id),
              "AP-",
              3,
              idx,
            ),
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

  /**
   * Nota belanja supplier tidak langsung tercatat — diajukan ke Owner.
   * Pembelian, tambahan stok, dan harga modal baru berlaku setelah disetujui.
   */
  const savePurchase = useCallback<StoreValue["savePurchase"]>(
    (draft) => {
      const current = getSnapshot();
      if (!draft.supplier.trim() || !draft.nota.trim())
        return { ok: false, msg: "Isi supplier dan no. nota" };
      if (!draft.items.length)
        return { ok: false, msg: "Tambahkan minimal satu barang" };
      const time = nowStamp();

      // Satu nota belanja = satu pengajuan approval (bukan per barang).
      const costChanges: CostChange[] = [];
      let beforeTotal = 0;
      for (const item of draft.items) {
        const variant = current.products
          .flatMap((p) => p.variants)
          .find((v) => v.id === item.vid);
        beforeTotal += item.qty * (variant?.cost ?? item.cost);
        if (variant && variant.cost !== item.cost)
          costChanges.push({
            vid: item.vid,
            before: variant.cost,
            after: item.cost,
          });
      }
      const request: PurchaseRequest = {
        supplier: draft.supplier.trim(),
        nota: draft.nota.trim(),
        date: draft.date,
        items: draft.items.map((i) => ({ ...i })),
      };

      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "nota" as const,
            type: "Izin belanja nota",
            before: beforeTotal,
            after: request.items.reduce((a, i) => a + i.qty * i.cost, 0),
            costChanges,
            purchaseRequest: request,
            user: prev.user,
            time,
            status: "Menunggu" as const,
          },
        ],
      }));
      return {
        ok: true,
        msg: "Nota belanja diajukan — menunggu approval Owner",
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
      const time = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        purchases: prev.purchases.map((x) =>
          x.id === purchaseId ? { ...x, payStatus: "Menunggu Lunas" } : x,
        ),
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
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

  /**
   * Pengajuan revisi satu nota belanja (tanggal, no. nota, supplier, qty/harga
   * barang). Stok dan harga modal baru menyesuaikan setelah disetujui Owner.
   */
  const revisePurchase = useCallback<StoreValue["revisePurchase"]>(
    (purchaseId, draft) => {
      const current = getSnapshot();
      const p = current.purchases.find((x) => x.id === purchaseId);
      if (!p) return { ok: false, msg: "Pembelian tidak ditemukan" };
      if (!draft.supplier.trim() || !draft.nota.trim())
        return { ok: false, msg: "Isi supplier dan no. nota" };
      if (!draft.items.length)
        return { ok: false, msg: "Tambahkan minimal satu barang" };
      if (
        current.approvals.some(
          (a) =>
            a.kind === "notaEdit" &&
            a.purchaseId === purchaseId &&
            a.status === "Menunggu",
        )
      )
        return {
          ok: false,
          msg: "Sudah ada pengajuan revisi yang menunggu approval Owner",
        };

      const sameHead =
        p.supplier === draft.supplier.trim() &&
        p.nota === draft.nota.trim() &&
        p.date === draft.date;
      const sameItems =
        p.items.length === draft.items.length &&
        p.items.every((it, i) => {
          const next = draft.items[i];
          return (
            next &&
            next.vid === it.vid &&
            next.qty === it.qty &&
            +next.cost === +it.cost
          );
        });
      if (sameHead && sameItems) return { ok: false, msg: "Tidak ada perubahan" };

      const time = nowStamp();
      const request: PurchaseRequest = {
        supplier: draft.supplier.trim(),
        nota: draft.nota.trim(),
        date: draft.date,
        items: draft.items.map((i) => ({ ...i })),
      };
      setSnapshot((prev) => ({
        ...prev,
        approvals: [
          ...prev.approvals,
          {
            id: nextId(prev.approvals.map((a) => a.id), "AP-"),
            kind: "notaEdit" as const,
            type: "Revisi nota belanja",
            purchaseId,
            before: purchaseTotal(p),
            after: request.items.reduce((a, i) => a + i.qty * i.cost, 0),
            purchaseRequest: request,
            user: prev.user,
            time,
            status: "Menunggu" as const,
            ref: purchaseId,
          },
        ],
      }));
      return { ok: true, msg: "Revisi nota diajukan — menunggu approval Owner" };
    },
    [],
  );

  /* ---------------- Stok opname ---------------- */

  const startOpname = useCallback(() => {
    const current = getSnapshot();
    const id = nextId(current.opnames.map((o) => o.id), "SO-");
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
      const current = getSnapshot();
      const o = current.opnames.find((x) => x.id === id);
      if (!o) return { ok: false, msg: "Sesi opname tidak ditemukan" };
      const cmp = compareOpname(current.products, o.lines);
      if (!cmp.ready)
        return { ok: false, msg: "Isi penyebab untuk setiap selisih" };
      const submittedAt = nowStamp();
      setSnapshot((prev) => ({
        ...prev,
        opnames: prev.opnames.map((x) =>
          x.id === id
            ? { ...x, status: "Menunggu" as const, sub: prev.user, submittedAt }
            : x,
        ),
      }));
      return { ok: true, msg: "Opname diajukan ke Owner" };
    },
    [],
  );

  const decideOpname = useCallback<StoreValue["decideOpname"]>((id, ok) => {
    const decidedAt = nowStamp();
    setSnapshot((prev) => {
      const o = prev.opnames.find((x) => x.id === id);
      if (!o) return prev;
      // Selisih dihitung terhadap stok terkini di tabel produk, bukan snapshot sesi.
      const cmp = compareOpname(prev.products, o.lines);
      const diffByVid = new Map(cmp.diffRows.map((r) => [r.vid, r]));
      const sysByVid = new Map(cmp.rows.map((r) => [r.vid, r.sys]));
      const history = [...prev.history];
      const products = prev.products.map((p) => ({
        ...p,
        variants: p.variants.map((v) => {
          const row = diffByVid.get(v.id);
          if (!ok || !row) return v;
          history.push({
            vid: v.id,
            date: TODAY,
            type: "Stok" as const,
            desc: `Stok opname ${o.id}: ${row.diff > 0 ? "+" : ""}${row.diff} (${row.note})`,
            user: prev.user,
          });
          return { ...v, stock: v.stock + row.diff };
        }),
      }));
      return {
        ...prev,
        products,
        history,
        opnames: prev.opnames.map((x) =>
          x.id === id
            ? {
                ...x,
                // Simpan stok sistem yang dipakai saat selisih diputuskan.
                lines: x.lines.map((l) => {
                  const sys = sysByVid.get(l.vid);
                  return sys === undefined ? l : { ...l, sys };
                }),
                status: ok ? "Disetujui" : "Ditolak",
                by: prev.user,
                decidedAt,
              }
            : x,
        ),
      };
    });
  }, []);

  /* ---------------- Approval ---------------- */

  const decideApproval = useCallback<StoreValue["decideApproval"]>((id, ok) => {
    const decidedAt = nowStamp();
    setSnapshot((prev) => {
      const a = prev.approvals.find((x) => x.id === id);
      if (!a) return prev;

      // Toko baru — disetujui jadi Aktif, ditolak jadi Diarsipkan.
      if (a.kind === "customer") {
        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === a.customerId
              ? {
                  ...c,
                  status: ok ? ("Aktif" as const) : ("Diarsipkan" as const),
                }
              : c,
          ),
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // Hapus toko — hapus permanen jika belum pernah transaksi,
      // selain itu arsipkan supaya riwayat transaksi tetap utuh.
      if (a.kind === "customerDelete") {
        let customers = prev.customers;
        if (ok && a.customerId) {
          const customer = prev.customers.find((c) => c.id === a.customerId);
          if (customer) {
            const hasSales = prev.sales.some((s) =>
              saleBelongsToCustomer(s, customer),
            );
            customers = hasSales
              ? prev.customers.map((c) =>
                  c.id === customer.id
                    ? { ...c, status: "Diarsipkan" as const }
                    : c,
                )
              : prev.customers.filter((c) => c.id !== customer.id);
          }
        }
        return {
          ...prev,
          customers,
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // Ubah data toko — baru diterapkan setelah disetujui Owner.
      if (a.kind === "customerEdit") {
        const changes = a.customerChanges ?? [];
        const nextName = ok
          ? changes.find((c) => c.field === "name")?.after
          : undefined;
        const nextPhone = ok
          ? changes.find((c) => c.field === "phone")?.after
          : undefined;
        const nextAddress = ok
          ? changes.find((c) => c.field === "address")?.after
          : undefined;

        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === a.customerId && ok
              ? {
                  ...c,
                  name: nextName ?? c.name,
                  phone:
                    nextPhone !== undefined
                      ? nextPhone || undefined
                      : c.phone,
                  address:
                    nextAddress !== undefined
                      ? nextAddress || undefined
                      : c.address,
                }
              : c,
          ),
          // Nama toko di invoice lama ikut diperbarui agar konsisten.
          sales: nextName
            ? prev.sales.map((s) =>
                s.customerId === a.customerId
                  ? { ...s, customer: nextName }
                  : s,
              )
            : prev.sales,
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // Hapus order penjualan — stok dikembalikan dan approval terkait ditolak.
      if (a.kind === "saleDelete") {
        const sale = prev.sales.find((s) => s.id === a.saleId);
        if (!ok || !sale)
          return {
            ...prev,
            approvals: prev.approvals.map((x) =>
              x.id === id
                ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
                : x,
            ),
          };

        const history = [...prev.history];
        const products = prev.products.map((p) => ({
          ...p,
          variants: p.variants.map((v) => {
            const qty = sale.items
              .filter((i) => i.vid === v.id)
              .reduce((sum, i) => sum + i.qty, 0);
            return qty > 0 ? { ...v, stock: v.stock + qty } : v;
          }),
        }));
        sale.items.forEach((i) => {
          history.push({
            vid: i.vid,
            date: TODAY,
            type: "Stok" as const,
            desc: `Hapus ${sale.id} +${i.qty} (dibatalkan)`,
            user: prev.user,
          });
        });

        return {
          ...prev,
          products,
          history,
          sales: prev.sales.filter((s) => s.id !== sale.id),
          approvals: prev.approvals.map((x) => {
            if (x.id === id)
              return {
                ...x,
                status: "Disetujui" as const,
                by: prev.user,
                decidedAt,
              };
            if (
              x.status === "Menunggu" &&
              x.saleId === sale.id &&
              (x.kind === "sale" || x.kind === "payment")
            )
              return {
                ...x,
                status: "Ditolak" as const,
                by: prev.user,
                decidedAt,
                note: "order dihapus",
              };
            return x;
          }),
        };
      }

      // 0. Invoice penjualan baru — transaksi & stok baru berlaku setelah disetujui
      if (a.kind === "invoice") {
        const req = a.saleRequest;
        if (!ok || !req)
          return {
            ...prev,
            approvals: prev.approvals.map((x) =>
              x.id === id
                ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
                : x,
            ),
          };

        // Nomor urut dari invoice terbesar + 1; kode bulan dari tanggal transaksi.
        const saleId = nextId(
          prev.sales.map((s) => s.id),
          `INV-${monthCode(req.date)}-`,
          4,
        );
        const sale: Sale = {
          id: saleId,
          date: req.date,
          customer: req.customer,
          customerId: req.customerId,
          type: req.type,
          due: req.type === "tempo" ? req.due : null,
          items: req.items.map((i) => ({ ...i })),
          ship: req.ship,
          pack: req.pack,
          other: req.other,
          note: "",
          payments: [],
        };
        // COD tidak lagi otomatis lunas: invoice berstatus Belum Lunas sampai
        // ada pengajuan pelunasan yang disetujui Owner (sama seperti tempo).
        if (sale.type === "tempo" && req.paid > 0)
          sale.payments.push({
            date: sale.date,
            amt: req.paid,
            method: "Transfer",
            status: "Disetujui",
          });

        return {
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
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "Disetujui" as const,
                  by: prev.user,
                  decidedAt,
                  saleId,
                }
              : x,
          ),
        };
      }

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
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
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
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // 3. Harga & biaya invoice (penjualan)
      if (a.kind === "sale") {
        const history = [...prev.history];
        const sales = prev.sales.map((s) => {
          if (s.id !== a.saleId || !ok || !a.revision) return s;
          a.revision.items.forEach((item, idx) => {
            const before = s.items[idx];
            if (before && before.price !== item.price)
              history.push({
                vid: item.vid,
                date: TODAY,
                type: "Harga" as const,
                desc: `Harga jual ${s.id}: Rp ${Number(before.price).toLocaleString("id-ID")} → Rp ${Number(item.price).toLocaleString("id-ID")}`,
                user: prev.user,
              });
          });
          return { ...s, ...a.revision };
        });
        return {
          ...prev,
          sales,
          history,
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // 4. Izin belanja satu nota supplier (nota baru + harga beli baru)
      if (a.kind === "nota") {
        const history = [...prev.history];
        const req = a.purchaseRequest;

        // 4a. Nota baru — pembelian & tambahan stok baru tercatat setelah disetujui.
        if (req) {
          if (!ok)
            return {
              ...prev,
              approvals: prev.approvals.map((x) =>
                x.id === id
                  ? { ...x, status: "Ditolak" as const, by: prev.user, decidedAt }
                  : x,
              ),
            };

          const purchaseId = nextId(
            prev.purchases.map((p) => p.id),
            "PB-",
          );
          const products = prev.products.map((p) => ({
            ...p,
            variants: p.variants.map((v) => {
              const item = req.items.find((i) => i.vid === v.id);
              const change = (a.costChanges ?? []).find((c) => c.vid === v.id);
              if (!item && !change) return v;
              if (change)
                history.push({
                  vid: v.id,
                  date: TODAY,
                  type: "Harga" as const,
                  desc: `Harga modal (nota ${req.nota}): Rp ${Number(change.before).toLocaleString("id-ID")} → Rp ${Number(change.after).toLocaleString("id-ID")}`,
                  user: prev.user,
                });
              return {
                ...v,
                stock: item ? v.stock + item.qty : v.stock,
                cost: change ? change.after : v.cost,
              };
            }),
          }));

          return {
            ...prev,
            products,
            purchases: [
              ...prev.purchases,
              {
                id: purchaseId,
                nota: req.nota,
                supplier: req.supplier,
                date: req.date,
                items: req.items.map((i) => ({ ...i })),
                payStatus: "Belum Lunas" as const,
              },
            ],
            history: [
              ...history,
              ...req.items.map((i) => ({
                vid: i.vid,
                date: req.date,
                type: "Stok" as const,
                desc: `Pembelian ${purchaseId} (${req.nota}) +${i.qty}`,
                user: prev.user,
              })),
            ],
            approvals: prev.approvals.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "Disetujui" as const,
                    by: prev.user,
                    decidedAt,
                    purchaseId,
                  }
                : x,
            ),
          };
        }

        // 4b. Nota lama — hanya harga beli yang diperbarui.
        const products = ok
          ? prev.products.map((p) => ({
              ...p,
              variants: p.variants.map((v) => {
                const change = (a.costChanges ?? []).find((c) => c.vid === v.id);
                if (!change) return v;
                history.push({
                  vid: v.id,
                  date: TODAY,
                  type: "Harga" as const,
                  desc: `Harga modal (nota ${a.purchaseId}): Rp ${Number(change.before).toLocaleString("id-ID")} → Rp ${Number(change.after).toLocaleString("id-ID")}`,
                  user: prev.user,
                });
                return { ...v, cost: change.after };
              }),
            }))
          : prev.products;
        return {
          ...prev,
          products,
          history,
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // 4c. Revisi nota belanja yang sudah tercatat — nota, stok, & modal baru
      if (a.kind === "notaEdit") {
        const history = [...prev.history];
        const req = a.purchaseRequest;
        const purchase = prev.purchases.find((x) => x.id === a.purchaseId);
        if (!ok || !req || !purchase)
          return {
            ...prev,
            approvals: prev.approvals.map((x) =>
              x.id === id
                ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
                : x,
            ),
          };

        const vids = new Set([
          ...purchase.items.map((i) => i.vid),
          ...req.items.map((i) => i.vid),
        ]);
        const products = prev.products.map((p) => ({
          ...p,
          variants: p.variants.map((v) => {
            if (!vids.has(v.id)) return v;
            const before = purchase.items.find((i) => i.vid === v.id);
            const after = req.items.find((i) => i.vid === v.id);
            const delta = (after?.qty ?? 0) - (before?.qty ?? 0);
            if (delta !== 0)
              history.push({
                vid: v.id,
                date: TODAY,
                type: "Stok" as const,
                desc: `Revisi nota ${req.nota}: ${delta > 0 ? "+" : ""}${delta}`,
                user: prev.user,
              });
            if (after && +after.cost !== +v.cost)
              history.push({
                vid: v.id,
                date: TODAY,
                type: "Harga" as const,
                desc: `Harga modal (revisi nota ${req.nota}): Rp ${Number(v.cost).toLocaleString("id-ID")} → Rp ${Number(after.cost).toLocaleString("id-ID")}`,
                user: prev.user,
              });
            return {
              ...v,
              stock: v.stock + delta,
              cost: after ? +after.cost : v.cost,
            };
          }),
        }));

        return {
          ...prev,
          products,
          history,
          purchases: prev.purchases.map((x) =>
            x.id === purchase.id
              ? {
                  ...x,
                  nota: req.nota,
                  supplier: req.supplier,
                  date: req.date,
                  items: req.items.map((i) => ({ ...i })),
                }
              : x,
          ),
          approvals: prev.approvals.map((x) =>
            x.id === id
              ? { ...x, status: "Disetujui" as const, by: prev.user, decidedAt }
              : x,
          ),
        };
      }

      // 5. Ubah data varian / rentang harga produk
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
            ? { ...x, status: ok ? "Disetujui" : "Ditolak", by: prev.user, decidedAt }
            : x,
        ),
      };
    });
  }, []);

  /* ---------------- Pengguna ---------------- */

  /**
   * Perubahan pengguna disimpan ke akun Supabase Auth lebih dulu, baru
   * dicatat di data toko — jadi role & status login selalu sama dengan
   * yang berlaku di Supabase.
   */
  const setUserRole = useCallback<StoreValue["setUserRole"]>(
    async (index, role) => {
      const user = getSnapshot().users[index];
      if (!user) return { ok: false, msg: "Pengguna tidak ditemukan" };
      if (user.role === "Owner")
        return { ok: false, msg: "Role Owner tidak bisa diubah" };

      if (configured) {
        const res = await patchAccount({ email: user.email, role });
        if (!res.ok) return res;
      }

      setSnapshot((prev) => ({
        ...prev,
        users: prev.users.map((u, i) => (i === index ? { ...u, role } : u)),
      }));
      return { ok: true, msg: "Role diperbarui" };
    },
    [configured],
  );

  const toggleUser = useCallback<StoreValue["toggleUser"]>(
    async (index) => {
      const user = getSnapshot().users[index];
      if (!user) return { ok: false, msg: "Pengguna tidak ditemukan" };
      const active = !user.active;

      if (configured) {
        const res = await patchAccount({ email: user.email, active });
        if (!res.ok) return res;
      }

      setSnapshot((prev) => ({
        ...prev,
        users: prev.users.map((u, i) =>
          i === index ? { ...u, active } : u,
        ),
      }));
      return {
        ok: true,
        msg: active ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan",
      };
    },
    [configured],
  );

  const inviteUser = useCallback<StoreValue["inviteUser"]>(
    async (u) => {
      const name = u.name.trim();
      const email = u.email.trim().toLowerCase();
      if (!name) return { ok: false, msg: "Isi nama" };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, msg: "Format email tidak valid" };
      const current = getSnapshot();
      if (
        current.users.some((x) => x.email.toLowerCase() === email.toLowerCase())
      )
        return { ok: false, msg: "Email itu sudah dipakai pengguna lain" };

      // Supabase aktif: akun login dibuat di Supabase Auth.
      if (configured) {
        if (u.password.length < 6)
          return { ok: false, msg: "Password minimal 6 karakter" };
        const res = await createAccount({
          name,
          email,
          role: u.role,
          password: u.password,
        });
        if (!res.ok) return res;
      }

      setSnapshot((prev) => ({
        ...prev,
        users: [...prev.users, { name, email, role: u.role, active: true }],
        // Pengguna pertama yang dibuat menjadi penanda pengguna aktif.
        user: prev.user || (u.role === "Owner" ? `${name} (Owner)` : prev.user),
      }));
      return { ok: true, msg: "Pengguna ditambahkan" };
    },
    [configured],
  );

  /** Ubah nama, email, dan role pengguna. Role Owner tidak bisa diturunkan. */
  const updateUser = useCallback<StoreValue["updateUser"]>(
    async (index, patch) => {
      const name = patch.name.trim();
      const email = patch.email.trim().toLowerCase();
      if (!name) return { ok: false, msg: "Isi nama pengguna" };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, msg: "Format email tidak valid" };

      const current = getSnapshot();
      const user = current.users[index];
      if (!user) return { ok: false, msg: "Pengguna tidak ditemukan" };
      if (
        current.users.some(
          (u, i) => i !== index && u.email.toLowerCase() === email.toLowerCase(),
        )
      )
        return { ok: false, msg: "Email itu sudah dipakai pengguna lain" };
      if (user.role === "Owner" && patch.role !== "Owner")
        return { ok: false, msg: "Role Owner tidak bisa diubah" };

      const role = user.role === "Owner" ? "Owner" : patch.role;

      if (configured) {
        const res = await patchAccount({
          email: user.email,
          name,
          newEmail: email,
          role,
        });
        if (!res.ok) return res;
      }

      const wasActive = isActiveUser(current.user, user);

      setSnapshot((prev) => ({
        ...prev,
        users: prev.users.map((u, i) =>
          i === index ? { ...u, name, email, role } : u,
        ),
        // Hanya penanda pengguna aktif yang mengikuti nama baru;
        // riwayat approval/opname lama tetap memakai nama saat kejadian.
        user: wasActive ? `${name} (${role})` : prev.user,
      }));
      return { ok: true, msg: "Data pengguna diperbarui" };
    },
    [configured],
  );

  /**
   * Hapus akun login. Akun di Supabase Auth dihapus lebih dulu; bila yang
   * dihapus adalah akun yang sedang dipakai, sesi ikut dicabut (keluar).
   * Bila akun terakhir dihapus, aplikasi kembali ke layar "Buat akun Owner".
   */
  const deleteUser = useCallback<StoreValue["deleteUser"]>(
    async (index) => {
      const current = getSnapshot();
      const user = current.users[index];
      if (!user) return { ok: false, msg: "Pengguna tidak ditemukan" };

      if (configured) {
        const res = await removeAccount(user.email);
        if (!res.ok) return res;
      }

      const wasActive = isActiveUser(current.user, user);
      setSnapshot((prev) => ({
        ...prev,
        users: prev.users.filter((_, i) => i !== index),
        user: wasActive ? "" : prev.user,
      }));

      const isMe =
        configured &&
        (session?.user.email ?? "").toLowerCase() === user.email.toLowerCase();
      if (isMe) {
        await signOut();
        return { ok: true, msg: "Akun dihapus — Anda telah keluar" };
      }
      return { ok: true, msg: "Akun dihapus" };
    },
    [configured, session, signOut],
  );

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
      storeReady,
      toast,
      clearData,
      updateBiz,
      updatePrefs,
      addExpense,
      updateExpense,
      removeExpense,
      restoreData,
      addCustomer,
      requestCustomerEdit,
      requestCustomerDelete,
      addSupplier,
      saveSale,
      requestSaleRevision,
      recordPayment,
      requestSaleDelete,
      addProduct,
      importProducts,
      submitChange,
      savePurchase,
      requestPurchaseLunas,
      revisePurchase,
      startOpname,
      updateOpnameLine,
      submitOpname,
      decideOpname,
      decideApproval,
      setUserRole,
      toggleUser,
      inviteUser,
      updateUser,
      deleteUser,
      cyclePerm,
    }),
    [
      db,
      storeReady,
      toast,
      clearData,
      updateBiz,
      updatePrefs,
      addExpense,
      updateExpense,
      removeExpense,
      restoreData,
      addCustomer,
      requestCustomerEdit,
      requestCustomerDelete,
      addSupplier,
      saveSale,
      requestSaleRevision,
      recordPayment,
      requestSaleDelete,
      addProduct,
      importProducts,
      submitChange,
      savePurchase,
      requestPurchaseLunas,
      revisePurchase,
      startOpname,
      updateOpnameLine,
      submitOpname,
      decideOpname,
      decideApproval,
      setUserRole,
      toggleUser,
      inviteUser,
      updateUser,
      deleteUser,
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
  /** False selama data toko dari Supabase belum selesai dimuat. */
  storeReady: boolean;
  toast: (msg: string) => void;
  clearData: () => void;
  updateBiz: (patch: Biz) => Result;
  updatePrefs: (patch: Prefs) => Result;
  addExpense: (e: { date: string; cat: string; amt: number }) => Result;
  updateExpense: (
    index: number,
    patch: { date?: string; cat?: string; amt?: number },
  ) => Result;
  removeExpense: (index: number) => Result;
  restoreData: (data: DB) => Result;
  addCustomer: (c: {
    name: string;
    phone?: string;
    address?: string;
  }) => Result;
  requestCustomerEdit: (
    id: string,
    patch: {
      name: string;
      phone?: string;
      address?: string;
    },
  ) => Result;
  requestCustomerDelete: (customerId: string, reason: string) => Result;
  addSupplier: (s: { name: string; phone?: string; address?: string }) => Result;
  saveSale: (draft: SaleDraft) => Result;
  requestSaleRevision: (saleId: string, revision: SaleRevision) => Result;
  recordPayment: (
    saleId: string,
    p: { date: string; amt: number; method: string },
  ) => Result;
  requestSaleDelete: (saleId: string, reason: string) => Result;
  addProduct: (p: {
    cat: string;
    name: string;
    minPrice: number;
    maxPrice: number;
    variants: VariantInput[];
  }) => Result;
  importProducts: (rows: ImportProductRow[]) => Result;
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
  revisePurchase: (purchaseId: string, draft: PurchaseDraft) => Result;
  startOpname: () => string;
  updateOpnameLine: (
    id: string,
    index: number,
    patch: Partial<OpnameLine>,
  ) => void;
  submitOpname: (id: string) => Result;
  decideOpname: (id: string, ok: boolean) => void;
  decideApproval: (id: string, ok: boolean) => void;
  setUserRole: (index: number, role: Role) => Promise<Result>;
  toggleUser: (index: number) => Promise<Result>;
  inviteUser: (u: {
    name: string;
    email: string;
    role: Role;
    password: string;
  }) => Promise<Result>;
  updateUser: (
    index: number,
    patch: { name: string; email: string; role: Role },
  ) => Promise<Result>;
  deleteUser: (index: number) => Promise<Result>;
  cyclePerm: (role: Role, module: ModuleKey) => void;
};

/** Nama toko bila tersedia (dipakai komponen kerangka seperti Drawer). */
export function useStoreName(): string {
  const ctx = useContext(StoreContext);
  return ctx?.db.biz.name ?? "";
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}
