"use client";

import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginResult =
  | { accessToken: string; mustChangePassword?: boolean }
  | { message: string };

export default function SignInClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = useMemo(() => sp.get("callbackUrl") || "/", [sp]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json().catch(() => null)) as LoginResult | null;
      if (!res.ok || !data || !("accessToken" in data) || !data.accessToken) {
        setError((data as any)?.message || "Login gagal");
        return;
      }

      // Store token for client-side API calls. (Server routes can also read HttpOnly cookie.)
      localStorage.setItem("accessToken", data.accessToken);

      if ((data as any).mustChangePassword) {
        router.replace(`/auth/change-password?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.replace(callbackUrl);
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-1 via-gray-2 to-white dark:from-dark dark:via-dark-2 dark:to-black" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-blue-light/20 blur-3xl dark:bg-blue-light/10" />

      {/* Theme toggle */}
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggleSwitch />
      </div>

      <div className="relative z-0 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-2">
          {/* Left / Branding */}
          <div className="hidden overflow-hidden rounded-3xl border border-stroke bg-white/70 p-10 shadow-sm backdrop-blur lg:flex lg:flex-col lg:justify-between dark:border-stroke-dark dark:bg-dark-2/60">
            <div>
              <div className="inline-flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/15">
                  <span className="text-lg font-bold">D</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide text-dark dark:text-white">DEJAPOO BMS</p>
                  <p className="text-body-xs text-dark-6">Brand Management System</p>
                </div>
              </div>

              <h2 className="mt-10 text-heading-6 font-semibold leading-tight text-dark dark:text-white">
                Kelola brand, desain, dan workflow tim dalam satu dashboard.
              </h2>
              <p className="mt-3 text-body-sm text-dark-6">
                Masuk untuk mengakses data terbaru, approval, dan aset desain.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-stroke bg-gray-1/70 p-6 dark:border-stroke-dark dark:bg-dark-3/60">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
                  {/* Shield icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-dark dark:text-white">Aman & cepat</p>
                  <p className="mt-1 text-body-xs text-dark-6">
                    Mode gelap/terang otomatis mengikuti preferensi perangkatmu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-stroke bg-white/80 p-7 shadow-sm backdrop-blur dark:border-stroke-dark dark:bg-dark-2/70 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-dark dark:text-white">Sign in</h1>
                  <p className="mt-1 text-body-sm text-dark-6">Masuk untuk melanjutkan</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-stroke bg-gray-1 px-3 py-1 text-body-xs text-dark-6 dark:border-stroke-dark dark:bg-dark-3">
                  v1
                </span>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-light-3 bg-red-light-6 p-4 text-sm text-red-dark dark:border-red/30 dark:bg-red/10 dark:text-red-light-3">
                  {error}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-dark dark:text-white">Username</label>
                  <div className="mt-1">
                    <input
                      className="w-full rounded-2xl border border-stroke bg-white px-4 py-3 outline-none transition focus:border-primary dark:border-stroke-dark dark:bg-dark-3"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="mis. admin"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-dark dark:text-white">Password</label>
                  <div className="mt-1 relative">
                    <input
                      className="w-full rounded-2xl border border-stroke bg-white px-4 py-3 pr-12 outline-none transition focus:border-primary dark:border-stroke-dark dark:bg-dark-3"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-dark-6 transition hover:bg-gray-2 dark:hover:bg-dark-4"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        // Eye-off
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M3 3l18 18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M10.6 10.6a3 3 0 004.2 4.2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M7.5 7.6C5.4 9.1 3.9 11 3 12c2 2.4 5.7 7 9 7 1.3 0 2.7-.5 4-1.3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14.1 5.3c2.6.6 5.2 3.4 6.9 6.7-.5.9-1.4 2.3-2.7 3.6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        // Eye
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-dark px-4 py-3 text-white transition disabled:opacity-60 dark:bg-white dark:text-dark"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <span className="absolute -left-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-white/15 blur-2xl dark:bg-dark/15" />
                    <span className="absolute -right-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl" />
                  </span>
                  <span className="relative font-medium">{loading ? "Signing in..." : "Sign in"}</span>
                </button>

                <div className="pt-3 text-center text-sm">
  <a href="/auth/forgot-password" className="text-primary hover:underline">
    Lupa password?
  </a>
</div>

<p className="pt-2 text-center text-body-xs text-dark-6">
  Tips: gunakan tombol di pojok kanan atas untuk switch night / light mode.
</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
