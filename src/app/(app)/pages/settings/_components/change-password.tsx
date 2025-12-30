"use client";

import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { apiFetch } from "@/lib/client";
import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setMsg(j?.message || "Gagal mengganti password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg("Password berhasil diganti");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ShowcaseSection title="Security" className="!p-7">
      <form onSubmit={onSubmit}>
        <div className="mb-5.5">
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Password Lama
          </label>
          <input
            type="password"
            placeholder="Masukkan password lama"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>

        <div className="mb-5.5 grid grid-cols-1 gap-5.5 sm:grid-cols-2">
          <div>
            <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
              Password Baru
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            />
          </div>
        </div>

        {msg ? (
          <p className="mb-4 text-sm text-body-color dark:text-dark-6">{msg}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-center text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </ShowcaseSection>
  );
}
