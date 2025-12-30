"use client";

import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type ChangeResult =
  | { ok: true }
  | { message: string };

export default function ChangePasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = useMemo(() => sp.get("callbackUrl") || "/", [sp]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Password lama wajib diisi.");
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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json().catch(() => ({}))) as ChangeResult;
      if (!res.ok) throw new Error((data as any)?.message || "Gagal ganti password");

      setDone(true);
      setTimeout(() => {
        router.replace(callbackUrl);
        router.refresh();
      }, 700);
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
          <div className="mb-2 text-xl font-semibold text-dark dark:text-white">Ganti Password</div>
          <div className="mb-6 text-sm text-dark-4 dark:text-dark-6">
            Demi keamanan, gunakan password yang kuat dan mudah kamu ingat.
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          {done && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              Password berhasil diubah. Mengarahkan...
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Password Lama</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Password Baru</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Konfirmasi Password Baru</label>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>

            <div className="text-center text-sm">
              <Link href={callbackUrl} className="text-primary hover:underline">
                Batal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
