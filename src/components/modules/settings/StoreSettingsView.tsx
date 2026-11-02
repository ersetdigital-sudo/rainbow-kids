"use client";
/* eslint-disable @next/next/no-img-element -- logo invoice dari Pengaturan Toko berupa data URL */

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { PageHead } from "@/components/ui/PageHead";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { downloadJson, stamp } from "@/lib/export";
import { prefsSupported } from "@/lib/db/settings";
import type { Biz, DB, Prefs } from "@/lib/types";

/** Batas ukuran logo: disimpan sebagai data URL di baris pengaturan Supabase. */
const MAX_LOGO_BYTES = 200 * 1024;

/** Huruf awal nama toko untuk kotak logo saat belum ada gambar. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TS";
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Kelola identitas toko & pengaturan operasional yang dipakai seluruh aplikasi. */
export function StoreSettingsView() {
  const { db, updateBiz, updatePrefs, restoreData, clearData, toast } =
    useStore();
  const { configured } = useAuth();
  const [bizForm, setBizForm] = useState<Biz>(db.biz);
  const [prefsForm, setPrefsForm] = useState<Prefs>(db.prefs);
  /** Metode pembayaran ditulis sebagai satu baris dipisah koma. */
  const [methods, setMethods] = useState(db.prefs.methods.join(", "));
  const [confirm, setConfirm] = useState<"clear" | "restore" | null>(null);
  const [pending, setPending] = useState<DB | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Ikuti data toko terbaru setelah dikosongkan atau dimuat ulang.
  const [lastDb, setLastDb] = useState({ biz: db.biz, prefs: db.prefs });
  if (db.biz !== lastDb.biz || db.prefs !== lastDb.prefs) {
    setLastDb({ biz: db.biz, prefs: db.prefs });
    setBizForm(db.biz);
    setPrefsForm(db.prefs);
    setMethods(db.prefs.methods.join(", "));
  }

  const field = (key: keyof Biz) => ({
    "aria-label": key,
    value: bizForm[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setBizForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const bizDirty = (Object.keys(db.biz) as (keyof Biz)[]).some(
    (k) => bizForm[k] !== db.biz[k],
  );
  const prefsDirty =
    prefsForm.dueDays !== db.prefs.dueDays ||
    methods !== db.prefs.methods.join(", ") ||
    prefsForm.note !== db.prefs.note ||
    prefsForm.minStock !== db.prefs.minStock ||
    prefsForm.logo !== db.prefs.logo;

  const save = () => {
    // Identitas toko baru divalidasi bila memang diubah, supaya pengaturan
    // operasional (logo/tempo/ambang stok/metode bayar) bisa disimpan lebih dulu.
    if (bizDirty) {
      const biz = updateBiz(bizForm);
      if (!biz.ok) {
        toast(biz.msg);
        return;
      }
    }
    const prefs = updatePrefs({
      ...prefsForm,
      methods: methods
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    });
    if (!prefs.ok) {
      toast(prefs.msg);
      return;
    }
    // Di database lama kolom logo/tempo/ambang stok/metode bayar belum ada,
    // jadi beri tahu apa yang benar-benar tersimpan.
    toast(
      prefsSupported()
        ? "Pengaturan toko disimpan"
        : "Identitas toko disimpan. Logo, tempo, ambang stok & metode bayar butuh supabase/migration-002-settings.sql",
    );
  };

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Logo harus berupa gambar");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast("Ukuran logo maksimal 200 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setPrefsForm((f) => ({ ...f, logo: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  };

  const backup = () => {
    downloadJson(`cadangan-toko-${stamp()}`, db);
    toast("Cadangan data diunduh");
  };

  const pickRestore = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "")) as DB;
        if (!parsed || !Array.isArray(parsed.products)) throw new Error();
        setPending(parsed);
        setConfirm("restore");
      } catch {
        toast("Berkas cadangan tidak dikenali");
      }
    };
    reader.readAsText(file);
  };

  const logo = prefsForm.logo || db.prefs.logo;

  return (
    <>
      <PageHead
        title="Pengaturan Toko"
        subtitle="Identitas toko, pengaturan operasional, dan cadangan data."
        actions={
          <Link href="/invoice" className="btn">
            Lihat invoice
          </Link>
        }
      />

      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-4 items-start">
        <div className="card p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="f">Nama toko</label>
              <input {...field("name")} placeholder="mis. Toko Anda" />
            </div>
            <div className="sm:col-span-2">
              <label className="f">Alamat toko</label>
              <input
                {...field("addr")}
                placeholder="Jl. ..., kota, kode pos"
              />
            </div>
            <div>
              <label className="f">Telepon</label>
              <input {...field("phone")} placeholder="0812-xxxx-xxxx" />
            </div>
            <div>
              <label className="f">Email</label>
              <input {...field("email")} placeholder="halo@toko.id" />
            </div>
            <div>
              <label className="f">NPWP (opsional)</label>
              <input {...field("npwp")} placeholder="Kosongkan bila tidak perlu dicetak" />
            </div>
            <div>
              <label className="f">Rekening utama toko</label>
              <input {...field("bank")} placeholder="BCA 1234567890 a.n. Toko" />
            </div>
          </div>

          <div
            className="text-[11px] uppercase tracking-wider mt-6 mb-2"
            style={{ color: "var(--mu)" }}
          >
            Pengaturan operasional
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="f">Jatuh tempo tempo (hari)</label>
              <input
                type="number"
                min={0}
                aria-label="jatuh tempo hari"
                value={prefsForm.dueDays}
                onChange={(e) =>
                  setPrefsForm((f) => ({ ...f, dueDays: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="f">Stok menipis di bawah</label>
              <input
                type="number"
                min={0}
                aria-label="ambang stok menipis"
                value={prefsForm.minStock}
                onChange={(e) =>
                  setPrefsForm((f) => ({ ...f, minStock: Number(e.target.value) }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="f">Metode pembayaran (pisahkan dengan koma)</label>
              <input
                aria-label="metode pembayaran"
                value={methods}
                onChange={(e) => setMethods(e.target.value)}
                placeholder="Transfer, Tunai, QRIS"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="f">Logo toko (maks. 200 KB)</label>
              <div className="flex items-center gap-2">
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  aria-label="unggah logo toko"
                  className="hidden"
                  onChange={(e) => pickLogo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => logoRef.current?.click()}
                >
                  Pilih logo
                </button>
                {logo && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setPrefsForm((f) => ({ ...f, logo: "" }))
                    }
                  >
                    Hapus logo
                  </button>
                )}
                <span className="text-[11.5px]" style={{ color: "var(--mu)" }}>
                  Tercetak di kepala invoice
                </span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="f">Catatan kaki invoice (opsional)</label>
              <textarea
                rows={3}
                aria-label="catatan kaki invoice"
                value={prefsForm.note}
                onChange={(e) =>
                  setPrefsForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="mis. Barang yang sudah dibeli tidak dapat ditukar setelah 3 hari."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="btn p"
              onClick={save}
              disabled={!bizDirty && !prefsDirty}
            >
              Simpan
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setBizForm(db.biz);
                setPrefsForm(db.prefs);
                setMethods(db.prefs.methods.join(", "));
              }}
              disabled={!bizDirty && !prefsDirty}
            >
              Batal
            </button>
          </div>
          <p className="text-[11.5px] mt-3" style={{ color: "var(--mu)" }}>
            Rekening ini dipakai sebagai tujuan transfer di semua invoice.
          </p>
        </div>

        <div className="card p-5">
          <div
            className="text-[11px] uppercase tracking-wider mb-3"
            style={{ color: "var(--mu)" }}
          >
            Pratinjau kepala invoice
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              borderBottom: "3px solid #FEC40B",
              paddingBottom: 14,
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt="Logo toko"
                style={{
                  width: 52,
                  height: 52,
                  objectFit: "contain",
                  borderRadius: 12,
                  flex: "0 0 auto",
                  background: "#fff",
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "#04123F",
                  color: "#FEC40B",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 20,
                  flex: "0 0 auto",
                }}
              >
                {initials(bizForm.name)}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>
                {bizForm.name || "Nama toko"}
              </div>
              <div style={{ color: "#555", lineHeight: 1.5 }}>
                {bizForm.addr || "Alamat toko"}
                <br />
                {bizForm.phone || "Telepon"} · {bizForm.email || "Email"}
                {bizForm.npwp?.trim() ? (
                  <>
                    <br />
                    NPWP {bizForm.npwp}
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="text-[12px] mt-3" style={{ color: "var(--mu)" }}>
            Catatan kaki: {prefsForm.note || "—"}
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <div
          className="text-[11px] uppercase tracking-wider mb-1"
          style={{ color: "var(--mu)" }}
        >
          Cadangan data
        </div>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--mu)" }}>
          Unduh seluruh data toko sebagai berkas JSON, atau pulihkan dari
          berkas cadangan. Akun login tidak ikut berubah.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={backup}>
            Unduh cadangan (JSON)
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            Pulihkan dari cadangan
            <input
              type="file"
              accept="application/json,.json"
              aria-label="pilih berkas cadangan"
              className="hidden"
              onChange={(e) => pickRestore(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <div
          className="text-[11px] uppercase tracking-wider mb-1"
          style={{ color: "var(--mu)" }}
        >
          Data toko
        </div>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--mu)" }}>
          Kosongkan semua data (produk, pelanggan, transaksi, pengguna) untuk
          mulai memakai data asli toko Anda.{" "}
          {configured
            ? "Data tersimpan di Supabase dan dipakai bersama semua pengguna."
            : "Data tersimpan di browser ini."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn d"
            onClick={() => setConfirm("clear")}
          >
            Kosongkan semua data
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "clear"}
        onClose={() => setConfirm(null)}
        title="Kosongkan semua data?"
        description={
          configured
            ? "Semua produk, pelanggan, transaksi, dan pengguna di Supabase akan dihapus untuk semua pengguna. Tindakan ini tidak bisa dibatalkan."
            : "Semua produk, pelanggan, transaksi, dan pengguna di browser ini akan dihapus. Tindakan ini tidak bisa dibatalkan."
        }
        confirmLabel="Ya, hapus semua"
        danger
        onConfirm={clearData}
      />

      <ConfirmDialog
        open={confirm === "restore"}
        onClose={() => {
          setConfirm(null);
          setPending(null);
        }}
        title="Pulihkan data dari cadangan?"
        description="Seluruh data toko saat ini akan diganti dengan isi berkas cadangan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, pulihkan"
        onConfirm={() => {
          if (pending) {
            const res = restoreData(pending);
            toast(res.msg);
          }
          setPending(null);
        }}
      />
    </>
  );
}
