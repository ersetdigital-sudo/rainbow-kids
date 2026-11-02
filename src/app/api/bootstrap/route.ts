import { createClient } from "@supabase/supabase-js";
import { emptyDb } from "@/lib/seed";
import type { AppUser, DB } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Apakah project masih belum punya akun sama sekali? */
export async function GET() {
  const admin = adminClient();
  if (!admin) return Response.json({ needsOwner: false });
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error) return Response.json({ needsOwner: false });
  return Response.json({ needsOwner: (data.users?.length ?? 0) === 0 });
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

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "Owner" },
  });
  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  // Catat Owner di data toko supaya langsung muncul di menu Pengguna.
  const { data: row } = await admin
    .from("app_state")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const saved = row?.data as DB | undefined;
  const base = saved && Array.isArray(saved.products) ? saved : emptyDb();
  const owner: AppUser = { name, email, role: "Owner", active: true };
  const users = base.users.some((u) => u.email.toLowerCase() === email)
    ? base.users
    : [...base.users, owner];

  await admin
    .from("app_state")
    .upsert({
      id: 1,
      data: { ...base, users, user: `${name} (Owner)` },
      updated_at: new Date().toISOString(),
    });

  return Response.json({ ok: true });
}
