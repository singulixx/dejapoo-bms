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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Stock Adjustment</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm">Outlet (opsional, default Gudang)</div>
          <select className="w-full border rounded p-2" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
            <option value="">(Default Gudang)</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.type})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm">Desain</div>
          <select className="w-full border rounded p-2" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Pilih desain...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm">Size</div>
          <select className="w-full border rounded p-2" value={size} onChange={(e) => setSize(e.target.value as Size)}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm">Delta Qty (+ / -)</div>
          <NumberInput value={deltaQty} onValueChange={setDeltaQty} placeholder="contoh: -2 atau 5" />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Alasan (wajib)</div>
          <input
            className="w-full border rounded p-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="mis: rusak, hilang, salah input"
          />
        </label>
      </div>

      <button className="bg-black text-white rounded px-4 py-2 disabled:opacity-50" onClick={submit} disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan Adjustment"}
      </button>
    </div>
  );
}
