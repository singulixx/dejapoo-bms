"use client";

import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ForgotResult =
  | { ok: true; resetToken: string }
  | { message: string };

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryKey }),
      });

      const data = (await res.json().catch(() => ({}))) as ForgotResult;
      if (!res.ok) throw new Error((data as any)?.message || "Gagal memproses");

      const resetToken = (data as any).resetToken as string | undefined;
      if (!resetToken) throw new Error("Reset token tidak tersedia");

      router.replace(`/auth/reset-password?resetToken=${encodeURIComponent(resetToken)}&username=${encodeURIComponent(username)}`);
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
          <div className="mb-2 text-xl font-semibold text-dark dark:text-white">Lupa Password</div>
          <div className="mb-6 text-sm text-dark-4 dark:text-dark-6">
            Karena tidak memakai email, reset password menggunakan <b>Recovery Key</b> yang kamu terima saat akun dibuat.
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Username</label>
              <input
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: staff1"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Recovery Key</label>
              <input
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="masukkan recovery key"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Memproses..." : "Lanjut Reset Password"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/sign-in" className="text-primary hover:underline">
                Kembali ke Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
