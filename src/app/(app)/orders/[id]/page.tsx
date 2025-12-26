"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
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

// Next.js 15 treats `params` as a Promise in Client Components.
// Unwrap with React.use() to avoid warnings and future breakage.
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/orders/${id}`);
      if (!res.ok) {
        const msg = res.status === 401 ? "Silakan login dulu." : `Gagal memuat data (HTTP ${res.status}).`;
        setError(msg);
        setOrder(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrder(data);
      setLoading(false);
    })();
  }, [id]);

  const qtyTotal = useMemo(() => {
    return (order?.items || []).reduce((a: number, it: any) => a + (it.qty || 0), 0);
  }, [order]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Detail Penjualan</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">Read-only (untuk audit & cek transaksi)</div>
        </div>

        <Link href="/orders" className="rounded-xl border border-stroke dark:border-white/10 px-4 py-2 text-sm hover:bg-white/5">
          ← Kembali
        </Link>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        {error ? <div className="text-red-500">{error}</div> : null}

        {!loading && !error && order ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-white dark:bg-black/30 p-4">
              <div className="mb-2 text-xs text-dark-6 dark:text-white/50">Ringkasan</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">No Order</div>
                  <div className="font-mono text-xs">{order.orderCode}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Tanggal</div>
                  <div>{formatDateTime(order.createdAt)}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Channel</div>
                  <div>{order.channel}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Outlet</div>
                  <div>{order.outlet?.name || "-"}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Payment</div>
                  <div>{order.paymentMethod || "-"}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Total Qty</div>
                  <div>{qtyTotal}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Total</div>
                  <div className="font-medium">{formatRupiah(order.totalAmount)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-white dark:bg-black/30 p-4">
              <div className="mb-2 text-xs text-dark-6 dark:text-white/50">Keterangan</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Status</div>
                  <div>{order.status}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Source</div>
                  <div>{order.source}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">Marketplace Order ID</div>
                  <div className="font-mono text-xs">{order.marketplaceOrderId || "-"}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-dark-5 dark:text-white/60">External Order ID</div>
                  <div className="font-mono text-xs">{order.externalOrderId || "-"}</div>
                </div>
                <div className="text-xs text-dark-6 dark:text-white/50">
                  Catatan: koreksi transaksi sebaiknya lewat Stock Adjustment/Opname (bukan edit order), supaya audit tetap aman.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!loading && !error && order ? (
        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
          <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Item</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-dark dark:text-white/90">
              <thead className="text-dark-5 dark:text-white/60">
                <tr>
                  <th className="py-2 text-left">Product ID</th>
                  <th className="py-2 text-left">Variant ID</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((it: any) => (
                  <tr key={it.id} className="border-t border-stroke dark:border-white/10">
                    <td className="py-2 font-mono text-xs">{it.productId}</td>
                    <td className="py-2 font-mono text-xs">{it.variantId}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right">{formatRupiah(it.price)}</td>
                    <td className="py-2 text-right">{formatRupiah(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
