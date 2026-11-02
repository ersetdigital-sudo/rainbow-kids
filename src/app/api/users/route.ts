import { createClient } from "@supabase/supabase-js";

type Body = {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
};

const ROLES = ["Owner", "Admin", "Approver", "User"];

/**
 * Membuat akun login baru (email + password) memakai service role key.
 * Hanya boleh dipanggil oleh pengguna yang sudah punya sesi Supabase.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { ok: false, msg: "Supabase belum dikonfigurasi di server" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return Response.json({ ok: false, msg: "Sesi tidak ditemukan" }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) {
    return Response.json({ ok: false, msg: "Sesi tidak valid" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const role = ROLES.includes(body?.role ?? "") ? (body?.role as string) : "User";

  if (!name) return Response.json({ ok: false, msg: "Isi nama" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, msg: "Format email tidak valid" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json(
      { ok: false, msg: "Password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, id: data.user?.id ?? null });
}
