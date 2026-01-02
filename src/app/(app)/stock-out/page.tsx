"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import NumberInput from "@/components/FormElements/NumberInput";
import { useNotify } from "@/components/ui/notify";

type Size = "S" | "M" | "L" | "XL" | "XXL";
type Channel = "SHOPEE" | "TIKTOK" | "OFFLINE_STORE" | "RESELLER";

type Variant = { id: string; size: Size; sku: string; price: number; isActive: boolean };
type Product = { id: string; name: string; category: string; sellPrice: number; isActive: boolean; variants: Variant[] };

type Row = { productId: string; size: Size; qty: number };

const SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

export default function StockOutPage() {
  const { toast } = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [channel, setChannel] = useState<Channel>("SHOPEE");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [destination, setDestination] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // qty default 0 supaya placeholder muncul
  const [rows, setRows] = useState<Row[]>([{ productId: "", size: "S", qty: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setErr(null);
    const res = await apiFetch("/api/products?includeInactive=0&page=1&pageSize=200");
    if (!res.ok) {
      setErr("Gagal memuat daftar desain");
      setLoading(false);
      return;
    }
    const j = await res.json();
    setProducts((j.items || []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { productId: "", size: "S", qty: 0 }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      if (!r.productId || r.qty <= 0) continue;
      const p = productMap.get(r.productId);
      const v = p?.variants?.find((x) => x.size === r.size);
      const price = v?.price ?? p?.sellPrice ?? 0;
      sum += price * r.qty;
    }
    return sum;
  }, [rows, productMap]);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const items = rows
        .filter((r) => r.productId && r.qty > 0)
        .map((r) => {
          const p = productMap.get(r.productId);
          const v = p?.variants?.find((x) => x.size === r.size);
          return { productId: r.productId, variantId: v?.id, qty: r.qty };
        });

      if (!items.length || items.some((it) => !it.variantId)) {
        setErr("Pilih desain & ukuran untuk semua baris, lalu isi qty");
        setSubmitting(false);
        return;
      }

      const isoDate = new Date(`${date}T00:00:00.000Z`).toISOString();

      
        const res = await apiFetch("/api/orders/manual", {
          method: "POST",
          body: JSON.stringify({
            channel,
            customerName: destination || undefined,
            note: note || undefined,
            date: isoDate,
            items: items.map((it) => ({ productId: it.productId, variantId: it.variantId!, qty: it.qty })),
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(j?.__error || j?.message || j?.error || "Gagal menyimpan barang keluar");
          setSubmitting(false);
          return;
        }

      toast({ title: "Berhasil", description: "Barang keluar tersimpan", variant: "success" });
      setRows([{ productId: "", size: "S", qty: 0 }]);
      setDestination("");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Barang Keluar</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">
          Input barang keluar (marketplace / offline / reseller). Stok otomatis berkurang (tidak boleh minus).
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Channel Penjualan</div>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="SHOPEE">Shopee</option>
              <option value="TIKTOK">TikTok Shop</option>
              <option value="OFFLINE_STORE">Toko Offline</option>
              <option value="RESELLER">Reseller</option>
            </select>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Tujuan (opsional)</div>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Mis. Nama pembeli / reseller"
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Tanggal</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Pilih tanggal"
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Catatan (opsional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. nomor pesanan / keterangan"
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr>
                <th className="py-2 text-left">Desain</th>
                <th className="py-2 text-left">Ukuran</th>
                <th className="py-2 text-right">Jumlah</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-stroke dark:border-white/20">
                  <td className="py-2">
                    <select
                      value={r.productId}
                      onChange={(e) => setRow(idx, { productId: e.target.value })}
                      className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      disabled={loading}
                    >
                      <option value="">-- Pilih desain --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <select
                      value={r.size}
                      onChange={(e) => setRow(idx, { size: e.target.value as Size })}
                      className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 text-dark dark:text-white px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <NumberInput
                        value={r.qty}
                        // biarkan kosong/0 saat input (validasi qty>0 dilakukan saat submit)
                        min={0}
                        placeholder="Qty"
                        onValueChange={(v) => setRow(idx, { qty: v })}
                        className="w-28 rounded-xl text-right bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                      />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => removeRow(idx)}
                      disabled={rows.length <= 1}
                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={addRow}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Tambah Baris
          </button>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="text-sm text-dark-5 dark:text-white/60">
              Total (estimasi): <span className="font-semibold">{total.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex items-center gap-3">
              {err ? <div className="text-sm text-red-400">{err}</div> : null}
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
              >
                {submitting ? "Menyimpan..." : "Simpan Barang Keluar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}