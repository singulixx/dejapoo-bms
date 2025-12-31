"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import Pagination from "@/components/ui/Pagination";
import { formatRupiah } from "@/lib/rupiah";

// use shared rupiah formatter

function formatDateTime(d: string) {
  try {
    return new Date(d).toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

const CHANNEL_OPTIONS = [
  { value: "", label: "Semua Channel" },
  { value: "OFFLINE_STORE", label: "Offline Store" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "RESELLER", label: "Reseller" },
];

export default function OrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (channel) qs.set("channel", channel);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));

    const res = await apiFetch(`/api/orders?${qs.toString()}`);
    if (!res.ok) {
      const msg = res.status === 401 ? "Silakan login dulu." : `Gagal memuat data (HTTP ${res.status}).`;
      setError(msg);
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  // reload when filters/page change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, from, to, page]);

  // when filter changes, reset to page 1
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, from, to]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Riwayat Penjualan</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">Semua transaksi (Offline, Shopee, TikTok, dll) — read-only</div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-dark-6 dark:text-white/50">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm"
            >
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-6 dark:text-white/50">Dari Tanggal</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-6 dark:text-white/50">Sampai Tanggal</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setChannel("");
                setFrom("");
                setTo("");
              }}
              className="w-full rounded-xl border border-stroke dark:border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        {error ? <div className="text-red-500">{error}</div> : null}

        {!loading && !error ? (
          items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-dark dark:text-white/90">
                <thead className="text-dark-5 dark:text-white/60">
                  <tr>
                    <th className="py-2 text-left">Tanggal</th>
                    <th className="py-2 text-left">No Order</th>
                    <th className="py-2 text-left">Channel</th>
                    <th className="py-2 text-right">Total Qty</th>
                    <th className="py-2 text-right">Total Nominal</th>
                    <th className="py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o: any) => {
                    const qty = (o.items || []).reduce((a: number, it: any) => a + (it.qty || 0), 0);
                    return (
                      <tr key={o.id} className="border-t border-stroke dark:border-white/10">
                        <td className="py-2">{formatDateTime(o.createdAt)}</td>
                        <td className="py-2 font-mono text-xs">{o.orderCode}</td>
                        <td className="py-2">{o.channel}</td>
                        <td className="py-2 text-right">{qty}</td>
                        <td className="py-2 text-right">{formatRupiah(o.totalAmount)}</td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/orders/${o.id}`}
                            className="rounded-lg border border-stroke dark:border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
                          >
                            Lihat
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-dark-5 dark:text-white/60">Belum ada transaksi.</div>
          )
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-dark-6 dark:text-white/50">
            Total: {total} transaksi
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
    </div>
  );
}
