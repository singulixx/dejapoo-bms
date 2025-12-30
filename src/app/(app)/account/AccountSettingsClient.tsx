"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiFetch } from "@/lib/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  user: {
    username: string;
    role: string;
  };
};

export default function AccountSettingsClient() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!mounted) return;
        if (j?.user?.username) setMe(j);
      })
      .catch(() => void 0);
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!currentPassword || !newPassword) {
      setMsg("Password lama dan password baru wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const r = await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j?.message || "Gagal mengganti password");
        return;
      }
      setMsg("Password berhasil diperbarui");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("accessToken");
      }
      router.replace("/auth/sign-in");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <Breadcrumb pageName="Account Settings" />

      <div className="rounded-2xl border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-dark dark:text-white">
            Akun
          </h1>
          <p className="text-sm text-body-color dark:text-dark-6">
            Pengaturan dasar untuk akun pengguna.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Username
            </label>
            <input
              value={me?.user.username || ""}
              disabled
              className="w-full rounded-lg border border-stroke bg-gray-2 px-4 py-2 text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Role
            </label>
            <input
              value={me?.user.role || ""}
              disabled
              className="w-full rounded-lg border border-stroke bg-gray-2 px-4 py-2 text-dark outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
        </div>

        <hr className="my-6 border-stroke dark:border-dark-3" />

        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-base font-semibold text-dark dark:text-white">
            Ganti Password
          </h2>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Password Lama
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-gray-2 px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Password Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-gray-2 px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-gray-2 px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>
          </div>

          {msg ? (
            <div className="rounded-lg bg-gray-2 px-4 py-3 text-sm text-dark dark:bg-dark-2 dark:text-white">
              {msg}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
            >
              Logout
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
