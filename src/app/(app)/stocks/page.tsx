"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/EmptyState";

type Outlet = { id: string; name: string; type: string };
type Product = { id: string; name: string };
type Row = {
  id: string;
  qty: number;
  outlet: Outlet;
  variant: { sku: string; size: string; color: string | null; minQty: number; product: { name: string } };
};

export default function StocksPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  const [outletId, setOutletId] = useState("");
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);

  async function load(next?: { page?: number; pageSize?: number; outletId?: string; productId?: string; size?: string; q?: string }) {
    setLoading(true);

    const oid = next?.outletId ?? outletId;
    const pid = next?.productId ?? productId;
    const sz = next?.size ?? size;
    const qq = next?.q ?? q;
    const pp = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    const params = new URLSearchParams();
    if (oid) params.set("outletId", oid);
    if (pid) params.set("productId", pid);
    if (sz) params.set("size", sz);
    if (qq) params.set("q", qq);
    params.set("page", String(pp));
    params.set("pageSize", String(ps));

    const summaryParams = new URLSearchParams(params);
    summaryParams.delete("page");
    summaryParams.delete("pageSize");
    summaryParams.set("summary", "1");

    const [oRes, pRes, sRes, sumRes] = await Promise.all([
      apiFetch("/api/outlets"),
      apiFetch("/api/products?pageSize=300&includeInactive=1"),
      apiFetch(`/api/stocks?${params.toString()}`),
      apiFetch(`/api/stocks?${summaryParams.toString()}`),
    ]);
    const oJson = oRes.ok ? await oRes.json() : { items: [] };
    const pJson = pRes.ok ? await pRes.json() : { items: [] };
    const sJson = sRes.ok ? await sRes.json() : { items: [], pagination: { total: 0 } };
    const sumJson = sumRes.ok ? await sumRes.json() : null;

    setOutlets(oJson.items || []);
    setItems(sJson.items || []);
    setTotalRows(sJson?.pagination?.total || 0);
    setProducts((pJson.items || []).map((x: any) => ({ id: x.id, name: x.name })));
    setSummary(sumJson);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalQtyOnPage = useMemo(() => items.reduce((a, b) => a + (b.qty || 0), 0), [items]);

  const SIZES = useMemo(() => ["", "S", "M", "L", "XL", "XXL"], []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stok Management</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">Multi outlet (Gudang & Toko)</div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <select
            className="rounded-xl bg-gray-2 px-3 py-2 text-sm text-dark outline-none dark:bg-black/40 dark:text-white"
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
          >
            <option value="">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-gray-2 px-3 py-2 text-sm text-dark outline-none dark:bg-black/40 dark:text-white"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Semua Desain</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-gray-2 px-3 py-2 text-sm text-dark outline-none dark:bg-black/40 dark:text-white"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            title="Filter size"
          >
            {SIZES.map((s) => (
              <option key={s || "ALL"} value={s}>
                {s || "Semua Size"}
              </option>
            ))}
          </select>

          <input
            className="rounded-xl bg-gray-2 px-3 py-2 text-sm text-dark outline-none dark:bg-black/40 dark:text-white"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari SKU / produk / outlet"
          />

          <button
            onClick={() => {
              setPage(1);
              load({ page: 1 });
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke bg-card p-4 text-sm text-dark-5 dark:border-white/10 dark:bg-card/5 dark:text-white/70">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            Baris (hasil filter):{" "}
            <span className="font-semibold text-dark dark:text-white">{totalRows}</span>
            <span className="ml-2 text-dark-6 dark:text-white/50">• Qty (halaman ini):</span>{" "}
            <span className="font-semibold text-dark dark:text-white">{totalQtyOnPage}</span>
            {summary?.lowRows != null ? (
              <>
                <span className="ml-2 text-dark-6 dark:text-white/50">• Stok menipis:</span>{" "}
                <span className="font-semibold text-dark dark:text-white">{summary.lowRows}</span>
              </>
            ) : null}
          </div>
          {summary?.totalsPerProduct?.length ? (
            <div className="text-xs text-dark-6 dark:text-white/50">
              Top desain: {summary.totalsPerProduct.slice(0, 3).map((x: any) => `${x.productName} (${x.totalQty})`).join(" • ")}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-stroke bg-card p-4 dark:border-white/10 dark:bg-card/5">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Stok per Varian per Outlet</div>
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}

        {items.length === 0 && !loading ? (
          <EmptyState
            title="Belum ada data stok"
            description="Belum ada stok yang tercatat. Pastikan kamu sudah membuat varian dan input barang masuk."
            illustration="/empty/empty-stocks.svg"
          />
        ) : (
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
        )}

        <Pagination
          className="mt-4"
          page={page}
          pageSize={pageSize}
          total={totalRows}
          disabled={loading}
          onPageChange={(p: number) => {
            setPage(p);
            load({ page: p });
          }}
        />
      </div>
    </div>
  );
}