"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/rupiah";

// use shared rupiah formatter

export default function ReportsPage() {
  const [sales, setSales] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await apiFetch("/api/reports/sales");
      setSales(res.ok ? await res.json() : null);
      setLoading(false);
    })();
  }, []);

  async function downloadStockCsv() {
    const res = await apiFetch("/api/reports/stock?format=csv");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadStockXlsx() {
    const res = await apiFetch("/api/reports/stock?format=xlsx");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-report.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadMovementsCsv() {
    const res = await apiFetch("/api/reports/movements?format=csv");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_movements.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadMovementsXlsx() {
    const res = await apiFetch("/api/reports/movements?format=xlsx");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-movements.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Laporan</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">Charts + Table + Export</div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-dark-5 dark:text-white/70">Export Laporan Stok</div>
            <div className="text-xs text-dark-6 dark:text-white/40">CSV (Excel bisa import)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadStockCsv} className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">Download CSV</button>
            <button onClick={downloadStockXlsx} className="rounded-xl border border-stroke dark:border-white/10 px-4 py-2 font-medium text-dark dark:text-white/80 hover:bg-gray-2/50 dark:hover:bg-white/5">Download XLSX</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-dark-5 dark:text-white/70">Export Pergerakan Barang (StockMovement)</div>
            <div className="text-xs text-dark-6 dark:text-white/40">IN/OUT/TRANSFER/ADJUSTMENT/OPNAME</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadMovementsCsv} className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">Download CSV</button>
            <button onClick={downloadMovementsXlsx} className="rounded-xl border border-stroke dark:border-white/10 px-4 py-2 font-medium text-dark dark:text-white/80 hover:bg-gray-2/50 dark:hover:bg-white/5">Download XLSX</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Ringkasan Penjualan</div>
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        {sales ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Light mode sebelumnya memakai bg-black/30 sehingga terlihat seperti kotak abu-abu besar */}
            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-white dark:bg-black/30 p-4">
              <div className="mb-2 text-xs text-dark-6 dark:text-white/50">Per Channel</div>
              <table className="w-full text-sm text-dark dark:text-white/90">
                <thead className="text-dark-5 dark:text-white/60">
                  <tr><th className="py-2 text-left">Channel</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">Omzet</th></tr>
                </thead>
                <tbody>
                  {(sales.byChannel || []).map((r: any) => (
                    <tr key={r.channel} className="border-t border-stroke dark:border-white/10">
                      <td className="py-2">{r.channel}</td>
                      <td className="py-2 text-right">{r.orders}</td>
                      <td className="py-2 text-right">{formatRupiah(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-white dark:bg-black/30 p-4">
              <div className="mb-2 text-xs text-dark-6 dark:text-white/50">Top Produk</div>
              <table className="w-full text-sm text-dark dark:text-white/90">
                <thead className="text-dark-5 dark:text-white/60">
                  <tr><th className="py-2 text-left">Produk</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Omzet</th></tr>
                </thead>
                <tbody>
                  {(sales.byProduct || []).slice(0, 10).map((r: any) => (
                    <tr key={r.productId} className="border-t border-stroke dark:border-white/10">
                      <td className="py-2">{r.productName}</td>
                      <td className="py-2 text-right">{r.qty}</td>
                      <td className="py-2 text-right">{formatRupiah(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-dark-5 dark:text-white/60">Belum ada data.</div>
        )}
      </div>
    </div>
  );
}
