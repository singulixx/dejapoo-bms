"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import NumberInput from "@/components/FormElements/NumberInput";
import { useNotify } from "@/components/ui/notify";

type Size = "S" | "M" | "L" | "XL" | "XXL";
type Variant = { id: string; size: Size; sku: string; isActive: boolean };
type Product = { id: string; name: string; category: string; isActive: boolean; variants: Variant[] };
type Outlet = { id: string; name: string; type: string; isActive: boolean };

const SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

export default function StockAdjustmentPage() {
  const { toast } = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const [outletId, setOutletId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [size, setSize] = useState<Size>("S");
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, oRes] = await Promise.all([
          apiFetch("/api/products?pageSize=100&includeInactive=true"),
          apiFetch("/api/outlets?pageSize=100&includeInactive=true"),
        ]);

        const pJson = pRes.ok ? await pRes.json() : { items: [] };
        const oJson = oRes.ok ? await oRes.json() : { items: [] };

        setProducts(pJson.items || []);
        setOutlets(oJson.items || []);
      } catch (e: any) {
        toast({ title: "Gagal load data", description: e?.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const variantId = useMemo(() => {
    const v = selectedProduct?.variants?.find((x) => x.size === size);
    return v?.id || "";
  }, [selectedProduct, size]);

  async function submit() {
    if (!variantId) return toast({ title: "Pilih desain & size dulu" });
    if (!reason.trim()) return toast({ title: "Alasan wajib diisi" });
    if (!deltaQty) return toast({ title: "Delta stok tidak boleh 0" });

    setSubmitting(true);
    try {
      await apiFetch("/api/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          outletId: outletId || undefined,
          variantId,
          deltaQty,
          reason,
        }),
      });

      toast({ title: "Stock adjustment berhasil" });
      setDeltaQty(0);
      setReason("");
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.message || "Error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-4 md:p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Stock Adjustment</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">
          Koreksi stok cepat (tambah/kurang) untuk kasus seperti rusak, hilang, atau salah input.
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Outlet (opsional, default Gudang)</div>
            <select
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
            >
              <option value="">(Default Gudang)</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.type})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Desain</div>
            <select
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Pilih desain...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Size</div>
            <select
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={size}
              onChange={(e) => setSize(e.target.value as Size)}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <div className="text-xs text-dark-6 dark:text-white/50">Delta Qty (+ / -)</div>
            <NumberInput
              value={deltaQty}
              onValueChange={setDeltaQty}
              placeholder="contoh: -2 atau 5"
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <div className="text-xs text-dark-6 dark:text-white/50">Alasan (wajib)</div>
            <input
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis: rusak, hilang, salah input"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-gray-2 disabled:text-dark-5 disabled:hover:bg-gray-2 disabled:opacity-100 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Menyimpan..." : "Simpan Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}
