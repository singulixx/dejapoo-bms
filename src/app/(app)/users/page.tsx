"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useRouter } from "next/navigation";

type CreateStaffResult =
  | { ok: true; username: string; role: string; password: string; recoveryKey: string }
  | { message: string };

export default function UsersPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<null | { username: string; password: string; recoveryKey: string }>(null);

  useEffect(() => {
    // UI gate: only OWNER can access Users page.
    apiFetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) {
          router.replace("/dashboard");
          return;
        }
        const data = (await r.json().catch(() => null)) as any;
        const role = String(data?.user?.role ?? "").trim().toUpperCase();
        if (role !== "OWNER") router.replace("/dashboard");
      })
      .catch(() => router.replace("/dashboard"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);

    const u = username.trim();
    if (!u) {
      setError("Username wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ username: u }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateStaffResult;
      if (!res.ok) throw new Error((data as any)?.message || "Gagal membuat STAFF");

      setCreated({
        username: (data as any).username,
        password: (data as any).password,
        recoveryKey: (data as any).recoveryKey,
      });
      setUsername("");
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dark dark:text-white">Manajemen Staff</h1>
        <p className="mt-1 text-sm text-dark-6">
          Hanya <b>OWNER</b> yang bisa membuat akun STAFF. Password &amp; Recovery Key akan ditampilkan <b>sekali</b>.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <h2 className="text-base font-semibold text-dark dark:text-white">Buat akun STAFF</h2>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Username</label>
            <input
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-3/40 dark:text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="contoh: staff1"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Membuat..." : "Buat STAFF"}
          </button>
        </form>

        <div className="mt-4 rounded-xl bg-gray-2 px-4 py-3 text-sm text-dark-6 dark:bg-dark-3/30">
          <ul className="list-disc space-y-1 pl-5">
            <li>STAFF login pertama kali menggunakan password awal lalu <b>wajib ganti password</b>.</li>
            <li>Recovery Key dipakai untuk fitur <b>Lupa Password</b> (tanpa email).</li>
          </ul>
        </div>
      </div>

      {created && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-200">
                Akun STAFF berhasil dibuat
              </h3>
              <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                Simpan data ini sekarang. Setelah halaman direfresh, data tidak bisa ditampilkan lagi.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-xl bg-white p-4 dark:bg-dark-2">
              <div className="text-xs font-medium text-dark-6">Username</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="font-mono text-sm text-dark dark:text-white">{created.username}</div>
                <button
                  onClick={() => copy(created.username)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3/40"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 dark:bg-dark-2">
              <div className="text-xs font-medium text-dark-6">Password awal</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="font-mono text-sm text-dark dark:text-white">{created.password}</div>
                <button
                  onClick={() => copy(created.password)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3/40"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 dark:bg-dark-2">
              <div className="text-xs font-medium text-dark-6">Recovery Key</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="font-mono text-sm text-dark dark:text-white">{created.recoveryKey}</div>
                <button
                  onClick={() => copy(created.recoveryKey)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3/40"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
