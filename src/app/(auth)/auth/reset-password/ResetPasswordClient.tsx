"use client";

import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type ResetResult =
  | { ok: true }
  | { message: string };

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const resetToken = useMemo(() => sp.get("resetToken") || "", [sp]);
  const username = useMemo(() => sp.get("username") || "", [sp]);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!resetToken) {
      setError("Reset token tidak ditemukan. Mulai dari menu Lupa Password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = (await res.json().catch(() => ({}))) as ResetResult;
      if (!res.ok) throw new Error((data as any)?.message || "Gagal reset password");

      setDone(true);
      setTimeout(() => router.replace("/auth/sign-in"), 800);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-2 via-gray-2 to-white dark:from-dark dark:via-dark-2 dark:to-black" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold text-dark dark:text-white">
          DejaPoo BMS
        </Link>
        <ThemeToggleSwitch />
      </div>

      {/* Card */}
      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-dark-3 dark:bg-dark-2/70">
          <div className="mb-2 text-xl font-semibold text-dark dark:text-white">Reset Password</div>
          <div className="mb-6 text-sm text-dark-4 dark:text-dark-6">
            {username ? (
              <>
                Reset password untuk <b>{username}</b>.
              </>
            ) : (
              "Masukkan password baru kamu."
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          {done && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Password berhasil direset. Mengarahkan ke halaman login...
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Password Baru</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Konfirmasi Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="ulang password baru"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Kembali
              </Link>
              <Link href="/auth/sign-in" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
