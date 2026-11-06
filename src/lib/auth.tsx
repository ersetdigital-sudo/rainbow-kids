"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { roleFromMetadata } from "./roles";
import type { Role } from "./types";

type Result = { ok: boolean; msg: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pesan error Supabase Auth diterjemahkan agar mudah dipahami pengguna. */
const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "Email atau password salah",
  "User not found": "Email atau password salah",
  "Email not confirmed": "Email belum dikonfirmasi. Cek kotak masuk email.",
  "Email rate limit exceeded": "Terlalu banyak percobaan masuk. Coba lagi nanti.",
  "User is banned": "Akun ini dinonaktifkan Owner. Hubungi Owner toko.",
  "Too many requests": "Terlalu banyak percobaan masuk. Coba lagi nanti.",
};

function authError(message: string): string {
  return AUTH_ERRORS[message] ?? message;
}

/**
 * Role akun yang sedang masuk. Dibaca dari `app_metadata` (hanya service role
 * yang bisa menulis); `user_metadata` cuma fallback untuk akun lama.
 */
export function roleOfSession(
  user: Session["user"] | null | undefined,
): Role | null {
  if (!user) return null;
  return roleFromMetadata(user.app_metadata, user.user_metadata);
}

type AuthValue = {
  /** True bila Supabase (URL + anon key) tersedia. */
  configured: boolean;
  /** False selama sesi tersimpan masih dibaca. */
  ready: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Tanpa Supabase tidak perlu menunggu apa pun: langsung mode lokal.
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Verifikasi email & password pengguna ke Supabase Auth.
   * Mengembalikan `ok: false` beserta pesan siap tampil bila gagal.
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const supabase = getSupabase();
      if (!supabase) return { ok: false, msg: "Supabase belum dikonfigurasi" };

      const mail = email.trim().toLowerCase();
      if (!mail) return { ok: false, msg: "Isi email" };
      if (!EMAIL_RE.test(mail)) {
        return { ok: false, msg: "Format email tidak valid" };
      }
      if (!password) return { ok: false, msg: "Isi password" };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });
      if (error) return { ok: false, msg: authError(error.message) };
      if (!data.user) return { ok: false, msg: "Gagal masuk. Coba lagi." };

      return { ok: true, msg: `Masuk sebagai ${data.user.email ?? mail}` };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      configured: isSupabaseConfigured,
      ready,
      session,
      signIn,
      signOut,
    }),
    [ready, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
