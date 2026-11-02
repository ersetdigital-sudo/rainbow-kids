import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PERMS } from "@/lib/workspace";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Satu baris identitas toko: kosong, siap diisi dari Pengaturan Toko. */
const EMPTY_BIZ = {
  id: 1,
  name: "",
  addr: "",
  phone: "",
  email: "",
  npwp: "",
  bank: "",
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Status project: apakah masih belum punya akun, dan apakah tabel-tabel data
 * toko sudah dibuat lewat supabase/schema.sql.
 */
export async function GET() {
  const admin = adminClient();
  if (!admin) return Response.json({ needsOwner: false, tableReady: false });

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const { error: tableError } = await admin
    .from("store_settings")
    .select("id")
    .limit(1);

  return Response.json({
    needsOwner: !error && (data.users?.length ?? 0) === 0,
    tableReady: !tableError,
  });
}

/**
 * Isi awal tabel relasional untuk toko baru: hak akses bawaan (4 role × 9
 * modul) dan satu baris `store_settings` kosong. Baris yang sudah ada tidak
 * pernah ditimpa (`ignoreDuplicates`).
 *
 * Baris `store_settings` dilewati bila masih ada snapshot skema lama
 * (`app_state`): baris itu penanda "sudah diinisialisasi", jadi menulisnya
 * lebih dulu akan membatalkan impor data lama di `db/index.ts`.
 */
async function seedWorkspace(admin: SupabaseClient): Promise<string | null> {
  const perms = Object.entries(DEFAULT_PERMS).flatMap(([role, modules]) =>
    Object.entries(modules).map(([module, level]) => ({
      role,
      module,
      level: String(level),
    })),
  );

  const { error: permError } = await admin
    .from("role_permissions")
    .upsert(perms, { onConflict: "role,module", ignoreDuplicates: true });
  if (permError) return `role_permissions: ${permError.message}`;

  const { data: legacy } = await admin.from("app_state").select("id").limit(1);
  if (legacy?.length) return null;

  const { error: settingsError } = await admin
    .from("store_settings")
    .upsert([EMPTY_BIZ], { onConflict: "id", ignoreDuplicates: true });
  if (settingsError) return `store_settings: ${settingsError.message}`;

  return null;
}

/** Buat akun Owner pertama (hanya bisa sekali, saat belum ada akun). */
export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin) {
    return Response.json(
      { ok: false, msg: "Supabase belum dikonfigurasi di server" },
      { status: 503 },
    );
  }

  // Tanpa tabel relasional, akun Owner tetap dibuat tetapi tokonya tidak bisa
  // menyimpan apa pun — jadi skema dicek lebih dulu.
  const { error: tableError } = await admin
    .from("store_settings")
    .select("id")
    .limit(1);
  if (tableError) {
    return Response.json(
      {
        ok: false,
        msg: "Tabel Supabase belum dibuat. Jalankan supabase/schema.sql di SQL Editor dulu.",
      },
      { status: 409 },
    );
  }

  const { data: existing, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (listError) {
    return Response.json({ ok: false, msg: listError.message }, { status: 400 });
  }
  if ((existing.users?.length ?? 0) > 0) {
    return Response.json(
      { ok: false, msg: "Akun sudah ada. Silakan masuk." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!name) return Response.json({ ok: false, msg: "Isi nama" }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, msg: "Format email tidak valid" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json(
      { ok: false, msg: "Password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "Owner" },
  });
  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  const seedError = await seedWorkspace(admin);
  if (seedError) {
    // Jangan tinggalkan akun tanpa toko yang siap dipakai — user bisa ulangi.
    if (created.user) await admin.auth.admin.deleteUser(created.user.id);
    return Response.json(
      { ok: false, msg: `Gagal menyiapkan tabel toko (${seedError})` },
      { status: 500 },
    );
  }

  // Akun Supabase Auth sudah menjadi sumber daftar pengguna — tidak ada
  // salinan terpisah yang perlu ditulis di sini.
  return Response.json({ ok: true });
}
