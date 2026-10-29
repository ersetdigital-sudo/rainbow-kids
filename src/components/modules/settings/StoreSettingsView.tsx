"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHead } from "@/components/ui/PageHead";
import type { Biz } from "@/lib/types";

/** Kelola identitas toko yang tercetak di kepala invoice. */
export function StoreSettingsView() {
  const { db, updateBiz, toast } = useStore();
  const [form, setForm] = useState<Biz>(db.biz);

  const field = (key: keyof Biz) => ({
    "aria-label": key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const dirty = (Object.keys(db.biz) as (keyof Biz)[]).some(
    (k) => form[k] !== db.biz[k],
  );

  const save = () => {
    const res = updateBiz(form);
    toast(res.msg);
  };

  return (
    <>
      <PageHead
        title="Pengaturan Toko"
        subtitle="Nama, alamat, dan kontak di bawah ini tercetak di kepala invoice."
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
              <input {...field("name")} placeholder="mis. Rainbow Kids" />
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
              <input {...field("npwp")} placeholder="00.000.000.0-000.000" />
            </div>
            <div>
              <label className="f">Rekening utama toko</label>
              <input {...field("bank")} placeholder="BCA 1234567890 a.n. Toko" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="btn p"
              onClick={save}
              disabled={!dirty}
            >
              Simpan
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setForm(db.biz)}
              disabled={!dirty}
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
              RK
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>
                {form.name || "Nama toko"}
              </div>
              <div style={{ color: "#555", lineHeight: 1.5 }}>
                {form.addr || "Alamat toko"}
                <br />
                {form.phone || "Telepon"} · {form.email || "Email"}
                <br />
                NPWP {form.npwp || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
