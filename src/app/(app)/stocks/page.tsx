"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";

type Outlet = { id: string; name: string; type: string };
type Row = {
  id: string;
  qty: number;
  outlet: Outlet;
  variant: { sku: string; size: string; color: string | null; minQty: number; product: { name: string } };
};

export default function StocksPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [outletId, setOutletId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [oRes, sRes] = await Promise.all([apiFetch("/api/outlets"), apiFetch(`/api/stocks?outletId=${encodeURIComponent(outletId)}&q=${encodeURIComponent(q)}&pageSize=100`)]);
    const oJson = oRes.ok ? await oRes.json() : { items: [] };
    const sJson = sRes.ok ? await sRes.json() : { items: [] };
    setOutlets(oJson.items || []);
    setItems(sJson.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const total = useMemo(() => items.reduce((a,b)=>a+b.qty,0), [items]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stok Management</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">Multi outlet (Gudang & Toko)</div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <select className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none" value={outletId} onChange={(e)=>setOutletId(e.target.value)}>
            <option value="">Semua Outlet</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari SKU / produk / outlet" />
          <button onClick={load} className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">Filter</button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4 text-sm text-dark-5 dark:text-white/70">
        Total stok (hasil filter): <span className="text-dark dark:text-white font-semibold">{total}</span>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Stok per Varian per Outlet</div>
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr>
                <th className="py-2 text-left">Outlet</th>
                <th className="py-2 text-left">Produk</th>
                <th className="py-2 text-left">SKU</th>
                <th className="py-2 text-left">Size</th>
                <th className="py-2 text-left">Warna</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-stroke dark:border-white/10">
                  <td className="py-2">{r.outlet.name}</td>
                  <td className="py-2">{r.variant.product.name}</td>
                  <td className="py-2 font-mono">{r.variant.sku}</td>
                  <td className="py-2">{r.variant.size}</td>
                  <td className="py-2 text-dark-5 dark:text-white/70">{r.variant.color || "-"}</td>
                  <td className={`py-2 text-right ${r.qty < r.variant.minQty ? "text-yellow-300" : ""}`}>{r.qty}</td>
                  <td className="py-2 text-right">{r.variant.minQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
