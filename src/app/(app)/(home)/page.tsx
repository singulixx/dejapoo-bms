"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/rupiah";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Summary = {
  totals: { products: number; variants: number; stockTotal: number; stockByOutlet: { outletName: string; qty: number }[] };
  sales: { today: { orders: number; amount: number }; month: { orders: number; amount: number }; byChannelToday: { channel: string; orders: number; amount: number }[] };
  alerts: { lowStockVariants: number; newMarketplaceOrders: number; marketplaceStockMismatch: number };
  topProducts: { productName: string; qty: number; revenue: number }[];
};

// use shared rupiah formatter

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
      <div className="text-xs text-dark-5 dark:text-white/60">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-dark-6 dark:text-white/40">{sub}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/dashboard/summary", { cache: "no-store" as any });
      if (!res.ok) {
        setErr("Gagal memuat dashboard. Coba login ulang.");
        return;
      }
      setData(await res.json());
    })();
  }, []);

  const channelSeries = useMemo(() => {
    const items = data?.sales.byChannelToday ?? [];
    return [
      {
        name: "Omzet",
        data: items.map((x) => x.amount),
      },
    ];
  }, [data]);

  const channelCategories = useMemo(() => (data?.sales.byChannelToday ?? []).map((x) => x.channel), [data]);

  const outletSeries = useMemo(() => {
    const items = data?.totals.stockByOutlet ?? [];
    return [{ name: "Stok", data: items.map((x) => x.qty) }];
  }, [data]);

  const outletCategories = useMemo(() => (data?.totals.stockByOutlet ?? []).map((x) => x.outletName), [data]);

  if (err) return <div className="p-6 text-red-400">{err}</div>;
  if (!data) return <div className="p-6 text-dark-5 dark:text-white/60">Loading...</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-dark-5 dark:text-white/60">Worldwide Edition</div>
          <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="Total Produk" value={`${data.totals.products}`} sub={`Varian: ${data.totals.variants}`} />
        <Card title="Total Stok" value={`${data.totals.stockTotal}`} sub="Gabungan semua outlet" />
        <Card title="Penjualan Hari Ini" value={formatRupiah(data.sales.today.amount)} sub={`${data.sales.today.orders} transaksi`} />
        <Card title="Penjualan Bulan Ini" value={formatRupiah(data.sales.month.amount)} sub={`${data.sales.month.orders} transaksi`} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card title="Stok Menipis" value={`${data.alerts.lowStockVariants}`} sub="Varian < min qty" />
        <Card title="Order Baru (Marketplace)" value={`${data.alerts.newMarketplaceOrders}`} sub="Shopee + TikTok" />
        <Card title="Mismatch Stok" value={`${data.alerts.marketplaceStockMismatch}`} sub="Marketplace vs master" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
          <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Penjualan per Channel (hari ini)</div>
          <Chart
            type="bar"
            height={280}
            series={channelSeries as any}
            options={{
              chart: { toolbar: { show: false }, background: "transparent" },
              xaxis: { categories: channelCategories },
              theme: { mode: isDark ? "dark" : "light" },
              dataLabels: { enabled: false },
              tooltip: { y: { formatter: (v: number) => formatRupiah(v) } },
            }}
          />
        </div>

        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
          <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Stok per Outlet</div>
          <Chart
            type="bar"
            height={280}
            series={outletSeries as any}
            options={{
              chart: { toolbar: { show: false }, background: "transparent" },
              xaxis: { categories: outletCategories },
              theme: { mode: isDark ? "dark" : "light" },
              dataLabels: { enabled: false },
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Produk Terlaris (Top 10)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr>
                <th className="py-2 text-left">Produk</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, idx) => (
                <tr key={idx} className="border-t border-stroke dark:border-white/10">
                  <td className="py-2">{p.productName}</td>
                  <td className="py-2 text-right">{p.qty}</td>
                  <td className="py-2 text-right">{formatRupiah(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
