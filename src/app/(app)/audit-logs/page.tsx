"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";

import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/EmptyState";
type AuditLog = {
  id: string;
  createdAt: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  action: string;
  model: string | null;
  entityId: string | null;
  method: string | null;
  path: string | null;
  ip: string | null;
  userAgent: string | null;
  data: any;
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function load(opts?: { page?: number }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(opts?.page ?? page), pageSize: String(pageSize) });
      if (q.trim()) params.set("q", q.trim());
      const res = await apiFetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.message || "Gagal memuat audit log");
        setItems([]);
        setTotal(0);
        return;
      }
      const j = await res.json();
      setItems(j.items || []);
      setTotal(j.total || 0);
    } catch (e: any) {
      setError("Gagal memuat audit log");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-gray-500">Melihat siapa melakukan apa (create/update/delete) di sistem.</p>
        </div>

        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari (user, action, model, id, path, ip...)"
            className="w-[280px] rounded border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-800 dark:bg-gray-950"
          />
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
          >
            Cari
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="Belum ada audit log"
          description="Audit log akan muncul setelah ada aktivitas (input stok, penjualan, dll)."
          illustration="/empty/empty-audit.svg"
        />
      ) : (
      <div className="mt-4 overflow-auto rounded border border-gray-200 dark:border-gray-800">
        <table className="min-w-[1100px] w-full text-left text-sm text-dark dark:text-white/90">
          <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
            <tr>
              <th className="px-3 py-2">Waktu</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Entity ID</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(it.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{it.username || "-"}</td>
                  <td className="px-3 py-2">{it.role || "-"}</td>
                  <td className="px-3 py-2 font-medium">{it.action}</td>
                  <td className="px-3 py-2">{it.model || "-"}</td>
                  <td className="px-3 py-2">{it.entityId || "-"}</td>
                  <td className="px-3 py-2">{it.path || "-"}</td>
                  <td className="px-3 py-2">{it.ip || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-500">
          Total: <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={loading}
          onPageChange={(p: number) => {
            // Only update state; the effect will trigger load()
            setPage(p);
          }}
        />
      </div>
    </div>
  );
}
