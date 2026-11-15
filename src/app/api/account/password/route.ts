import { createClient } from "@supabase/supabase-js";

const MIN_PASSWORD = 6;

function fail(msg: string, status: number) {
  return Response.json({ ok: false, msg }, { status });
}

/**
 * Ganti password akun yang sedang masuk. Password lama diperiksa di server
 * dengan klien sementara (tanpa menyimpan sesi), lalu password baru ditulis
 * lewat service role — sesi di browser tidak ikut berubah.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return fail("Supabase belum dikonfigurasi di server", 503);
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return fail("Sesi tidak ditemukan", 401);

  const noSession = { persistSession: false, autoRefreshToken: false };
  const admin = createClient(url, serviceKey, { auth: noSession });

  const { data, error } = await admin.auth.getUser(token);
  const user = data.user;
  if (error || !user?.email) return fail("Sesi tidak valid", 401);

  const body = (await request.json().catch(() => null)) as {
    current?: string;
    next?: string;
  } | null;
  const current = body?.current ?? "";
  const next = body?.next ?? "";

  if (!current) return fail("Isi password lama", 400);
  if (next.length < MIN_PASSWORD) {
    return fail(`Password baru minimal ${MIN_PASSWORD} karakter`, 400);
  }
  if (next === current) {
    return fail("Password baru harus berbeda dari password lama", 400);
  }

  // Buktikan pemanggil tahu password lama (sesi yang dicuri saja tidak cukup).
  const verifier = createClient(url, anonKey, { auth: noSession });
  const check = await verifier.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (check.error) return fail("Password lama salah", 400);

  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { password: next },
  );
  if (updateError) return fail(updateError.message, 400);

  return Response.json({ ok: true });
}
