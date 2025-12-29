"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginResult =
  | { ok: true; token: string; user: { id: string; username: string; role: string } }
  | { ok: false; message: string };

export default function SignInClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = useMemo(() => sp.get("callbackUrl") || "/", [sp]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

      if (!res.ok || !data || ("ok" in data && data.ok === false)) {
        setError((data as any)?.message || "Login gagal");
        return;
      }

      // Token is returned by the API. For this template, we store it in localStorage
      // and send it as Bearer token from the client.
      // If you prefer httpOnly cookies, adjust the API + middleware.
      const token = (data as any).token as string;
      localStorage.setItem("access_token", token);

      router.replace(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">Masuk untuk melanjutkan</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
