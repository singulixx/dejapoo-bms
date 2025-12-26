"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";

export default function SignInPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [nextPath, setNextPath] = useState("/dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a `next` query param is present (legacy redirects), keep behavior
  // but clean the visible URL to `/auth/sign-in`.
  useEffect(() => {
    const next = sp.get("next") || "/dashboard";
    setNextPath(next);

    if (sp.has("next")) {
      router.replace("/auth/sign-in");
    }
  }, [router, sp]);

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Login gagal. Coba lagi.");
        setLoading(false);
        return;
      }

      // Prefer cookie-based auth; if API also returns token, keep it for compatibility
      if (data?.accessToken) {
        try {
          localStorage.setItem("accessToken", data.accessToken);
        } catch {}
      }

      router.replace(nextPath || "/dashboard");
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-dark-2 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Sign In</h1>
          <ThemeToggleSwitch />
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3"
              placeholder="Masukkan username"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 pr-12 text-sm outline-none focus:border-primary dark:border-dark-3"
                placeholder="Masukkan password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs opacity-70 hover:opacity-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-200 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground dark:text-muted-foreground">
          &copy; {new Date().getFullYear()} DEJAPOO
        </p>
      </div>
    </div>
  );
}
