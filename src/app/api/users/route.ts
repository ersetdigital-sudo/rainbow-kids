import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ROLES, roleOfUser } from "@/lib/roles";
import type { AppUser, Role } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ban panjang = akun dinonaktifkan (tidak bisa masuk). */
const BAN_INACTIVE = "876000h";

/**
 * Role disimpan di `app_metadata` (hanya bisa ditulis service role).
 * `user_metadata` tidak lagi dipakai untuk role baru.
 */
type Meta = { name?: string; role?: string };

type ServerUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  banned_until?: string | null;
};

type Caller = {
  admin: SupabaseClient;
  id: string;
  email: string;
  role: Role;
};

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isBanned(user: ServerUser): boolean {
  return (
    Boolean(user.banned_until) &&
    new Date(user.banned_until as string).getTime() > Date.now()
  );
}

/** Akun Supabase Auth → baris pengguna di aplikasi. */
function toAppUser(user: ServerUser): AppUser {
  const meta = (user.user_metadata ?? {}) as Meta;
  const email = (user.email ?? "").trim();
  return {
    name: (meta.name ?? "").trim() || email.split("@")[0] || email,
    email,
    role: roleOfUser(user),
    active: !isBanned(user),
  };
}

/**
 * Akun lama menyimpan role di `user_metadata`. Salin sekali ke `app_metadata`
 * supaya pengguna tidak bisa lagi mengubah rolenya sendiri.
 */
async function migrateLegacyRoles(
  admin: SupabaseClient,
  users: ServerUser[],
): Promise<void> {
  for (const user of users) {
    if (!user.id) continue;
    const app = (user.app_metadata ?? {}) as Meta;
    if (ROLES.includes(app.role as Role)) continue;
    const legacy = (user.user_metadata ?? {}) as Meta;
    if (!ROLES.includes(legacy.role as Role)) continue;

    const appMetadata = { ...(user.app_metadata ?? {}), role: legacy.role };
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: appMetadata,
    });
    if (!error) user.app_metadata = appMetadata;
  }
}

async function listUsers(admin: SupabaseClient): Promise<ServerUser[]> {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) return [];
  const users = (data.users ?? []).filter((u) => Boolean(u.email)) as ServerUser[];
  await migrateLegacyRoles(admin, users);
  return users;
}

function activeOwners(users: ServerUser[]): ServerUser[] {
  return users.filter((u) => roleOfUser(u) === "Owner" && !isBanned(u));
}

/** Pengguna yang sudah punya sesi Supabase sekaligus role-nya dari app_metadata. */
async function requireCaller(request: Request): Promise<Caller | Response> {
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
  const user = data.user;
  if (error || !user) {
    return Response.json(
      { ok: false, msg: "Sesi tidak valid" },
      { status: 401 },
    );
  }

  return {
    admin,
    id: user.id,
    email: (user.email ?? "").trim().toLowerCase(),
    role: roleOfUser(user),
  };
}

/** Hanya Owner yang boleh mengubah daftar pengguna. */
function requireOwner(caller: Caller, action: string): Response | null {
  if (caller.role === "Owner") return null;
  return Response.json(
    { ok: false, msg: `Hanya Owner yang boleh ${action}` },
    { status: 403 },
  );
}

function notFound(): Response {
  return Response.json(
    { ok: false, msg: "Pengguna tidak ditemukan" },
    { status: 404 },
  );
}

function invalidEmail(): Response {
  return Response.json(
    { ok: false, msg: "Email pengguna tidak valid" },
    { status: 400 },
  );
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

  const denied = requireOwner(ctx, "mengubah pengguna");
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
    newEmail?: string;
    role?: string;
    active?: boolean;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return invalidEmail();

  const users = await listUsers(ctx.admin);
  const target = users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target) return notFound();

  const currentRole = roleOfUser(target);
  const currentActive = !isBanned(target);
  const nextRole = ROLES.includes(body?.role as Role)
    ? (body?.role as Role)
    : currentRole;
  const nextActive =
    typeof body?.active === "boolean" ? body.active : currentActive;

  // Owner tidak boleh mengunci diri sendiri di luar aplikasi.
  if (target.id === ctx.id && (nextRole !== "Owner" || !nextActive)) {
    return Response.json(
      {
        ok: false,
        msg: "Akun Owner tidak bisa menonaktifkan atau menurunkan dirinya sendiri",
      },
      { status: 403 },
    );
  }

  // Toko wajib punya minimal satu Owner aktif.
  const ownerStepsDown =
    currentRole === "Owner" &&
    currentActive &&
    (nextRole !== "Owner" || !nextActive);
  if (ownerStepsDown && activeOwners(users).length <= 1) {
    return Response.json(
      { ok: false, msg: "Toko harus punya minimal satu Owner aktif" },
      { status: 403 },
    );
  }

  const meta = { ...((target.user_metadata ?? {}) as Meta) };
  // Role tidak lagi disimpan di user_metadata.
  delete meta.role;
  if (typeof body?.name === "string" && body.name.trim()) {
    meta.name = body.name.trim();
  }

  const appMeta = { ...((target.app_metadata ?? {}) as Meta) };
  // Jangan pernah menghapus role: akun lama yang belum tersalin tetap memakai
  // role lamanya saat user_metadata dibersihkan di bawah.
  if (!ROLES.includes(appMeta.role as Role)) appMeta.role = currentRole;
  if (ROLES.includes(body?.role as Role)) {
    appMeta.role = body?.role as Role;
  }

  const attrs: {
    email?: string;
    email_confirm?: boolean;
    ban_duration?: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  } = { user_metadata: meta, app_metadata: appMeta };

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

/** Hapus akun login permanen dari Supabase Auth. */
export async function DELETE(request: Request) {
  const ctx = await requireCaller(request);
  if (ctx instanceof Response) return ctx;

  const denied = requireOwner(ctx, "menghapus akun");
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return invalidEmail();

  const users = await listUsers(ctx.admin);
  const target = users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target) return notFound();

  if (target.id === ctx.id) {
    return Response.json(
      { ok: false, msg: "Akun Owner tidak bisa menghapus akunnya sendiri" },
      { status: 403 },
    );
  }

  const targetIsActiveOwner =
    roleOfUser(target) === "Owner" && !isBanned(target);
  if (targetIsActiveOwner && activeOwners(users).length <= 1) {
    return Response.json(
      { ok: false, msg: "Toko harus punya minimal satu Owner aktif" },
      { status: 403 },
    );
  }

  const { error } = await ctx.admin.auth.admin.deleteUser(
    target.id as string,
  );
  if (error) {
    return Response.json({ ok: false, msg: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
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

  const denied = requireOwner(ctx, "menambah pengguna");
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Body | null;
  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const role = ROLES.includes(body?.role as Role)
    ? (body?.role as Role)
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
    user_metadata: { name },
    app_metadata: { role },
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
