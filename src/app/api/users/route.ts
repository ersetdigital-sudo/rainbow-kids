import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppUser, Role } from "@/lib/types";

const ROLES: Role[] = ["Owner", "Admin", "Approver", "User"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ban panjang = akun dinonaktifkan (tidak bisa masuk). */
const BAN_INACTIVE = "876000h";

type Meta = { name?: string; role?: string };

type ServerUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  banned_until?: string | null;
};

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Akun Supabase Auth → baris pengguna di aplikasi. */
function toAppUser(user: ServerUser): AppUser {
  const meta = (user.user_metadata ?? {}) as Meta;
  const email = (user.email ?? "").trim();
  const role = ROLES.includes(meta.role as Role) ? (meta.role as Role) : "User";
  const banned =
    Boolean(user.banned_until) &&
    new Date(user.banned_until as string).getTime() > Date.now();
  return {
    name: (meta.name ?? "").trim() || email.split("@")[0] || email,
    email,
    role,
    active: !banned,
  };
}

async function listUsers(admin: SupabaseClient): Promise<ServerUser[]> {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) return [];
  return (data.users ?? []).filter((u) => Boolean(u.email)) as ServerUser[];
}

/** Hanya pengguna yang sudah punya sesi Supabase yang boleh memakai route ini. */
async function requireCaller(
  request: Request,
): Promise<{ admin: SupabaseClient } | Response> {
  const admin = adminClient();
  if (!admin) {
    return Response.json(
      { ok: false, msg: "Supabase belum dikonfigurasi di server" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return Response.json(
      { ok: false, msg: "Sesi tidak ditemukan" },
      { status: 401 },
    );
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return Response.json(
      { ok: false, msg: "Sesi tidak valid" },
      { status: 401 },
    );
  }

  return { admin };
}

/** Daftar pengguna sebenarnya (akun Supabase Auth). */
export async function GET(request: Request) {
  const ctx = await requireCaller(request);
  if (ctx instanceof Response) return ctx;

  const users = (await listUsers(ctx.admin))
    .map(toAppUser)
    .sort((a, b) =>
      a.role === b.role ? a.name.localeCompare(b.name) : a.role === "Owner" ? -1 : b.role === "Owner" ? 1 : 0,
    );

  return Response.json({ ok: true, users });
}

/** Ubah nama / email / role / status aktif sebuah akun Supabase Auth. */
export async function PATCH(request: Request) {
  const ctx = await requireCaller(request);
  if (ctx instanceof Response) return ctx;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
    newEmail?: string;
    role?: string;
    active?: boolean;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { ok: false, msg: "Email pengguna tidak valid" },
      { status: 400 },
    );
  }

  const target = (await listUsers(ctx.admin)).find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (!target) {
    return Response.json(
      { ok: false, msg: "Pengguna tidak ditemukan" },
      { status: 404 },
    );
  }

  const meta = { ...((target.user_metadata ?? {}) as Meta) };
  const attrs: {
    email?: string;
    email_confirm?: boolean;
    ban_duration?: string;
    user_metadata: Record<string, unknown>;
  } = { user_metadata: meta };

  if (typeof body?.name === "string" && body.name.trim()) {
    meta.name = body.name.trim();
  }
  if (ROLES.includes(body?.role as Role)) {
    meta.role = body?.role;
  }

  if (typeof body?.newEmail === "string") {
    const next = body.newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) {
      return Response.json(
        { ok: false, msg: "Format email tidak valid" },
        { status: 400 },
      );
    }
    if (next !== email) {
      attrs.email = next;
      attrs.email_confirm = true;
    }
  }

  if (typeof body?.active === "boolean") {
    attrs.ban_duration = body.active ? "none" : BAN_INACTIVE;
  }

  const { data, error } = await ctx.admin.auth.admin.updateUserById(
    target.id as string,
    attrs,
  );
  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, user: toAppUser(data.user) });
}

type Body = {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
};

/** Membuat akun login baru (email + password) memakai service role key. */
export async function POST(request: Request) {
  const ctx = await requireCaller(request);
  if (ctx instanceof Response) return ctx;

  const body = (await request.json().catch(() => null)) as Body | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const role = ROLES.includes(body?.role as Role)
    ? (body?.role as string)
    : "User";

  if (!name) return Response.json({ ok: false, msg: "Isi nama" }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { ok: false, msg: "Format email tidak valid" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return Response.json(
      { ok: false, msg: "Password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  return Response.json({
    ok: true,
    id: data.user?.id ?? null,
    user: data.user ? toAppUser(data.user) : null,
  });
}
