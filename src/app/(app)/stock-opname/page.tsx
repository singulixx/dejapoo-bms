"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import NumberInput from "@/components/FormElements/NumberInput";
import { useNotify } from "@/components/ui/notify";

type Size = "S" | "M" | "L" | "XL" | "XXL";
type Variant = { id: string; size: Size; sku: string; isActive: boolean };
type Product = { id: string; name: string; category: string; isActive: boolean; variants: Variant[] };
type Outlet = { id: string; name: string; type: string; isActive: boolean };

type Row = { productId: string; size: Size; countedQty: number };

const SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

export default function StockOpnamePage() {
  const { toast } = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const [outletId, setOutletId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [rows, setRows] = useState<Row[]>([{ productId: "", size: "S", countedQty: 0 }]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({}); // variantId -> qty
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

  // Load current system stock for selected outlet (optional).
  useEffect(() => {
    (async () => {
      try {
        if (!outletId) {
          setStockMap({});
          return;
        }
        const res = await apiFetch(`/api/stocks?outletId=${encodeURIComponent(outletId)}&pageSize=200`);
        const m: Record<string, number> = {};
        for (const s of res.items || []) m[s.variantId] = s.qty;
        setStockMap(m);
      } catch (e: any) {
        toast({ title: "Gagal load stok", description: e?.message });
      }
    })();
  }, [outletId, toast]);

  const getVariantId = (productId: string, size: Size) => {
    const p = products.find((x) => x.id === productId);
    const v = p?.variants?.find((x) => x.size === size);
    return v?.id || "";
  };

  const computed = useMemo(() => {
    return rows.map((r) => {
      const variantId = getVariantId(r.productId, r.size);
      const systemQty = variantId ? stockMap[variantId] ?? 0 : 0;
      const diff = r.countedQty - systemQty;
      return { ...r, variantId, systemQty, diff };
    });
  }, [rows, products, stockMap]);

  function addRow() {
    setRows((prev) => [...prev, { productId: "", size: "S", countedQty: 0 }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const items = computed
      .filter((r) => r.variantId)
      .map((r) => ({ variantId: r.variantId, countedQty: r.countedQty }));

    if (!items.length) return toast({ title: "Minimal 1 item dengan desain & size valid" });

    setSubmitting(true);
    try {
      await apiFetch("/api/stock/opname", {
        method: "POST",
        body: JSON.stringify({
          outletId: outletId || undefined,
          note: note || undefined,
          items,
        }),
      });

      toast({ title: "Stock opname berhasil" });
      setRows([{ productId: "", size: "S", countedQty: 0 }]);
      setNote("");
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.message || "Error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Stock Opname</h1>

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
          <div className="text-sm">Catatan</div>
          <input
            className="w-full border rounded p-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="mis: opname akhir bulan"
          />
        </label>
      </div>

      <div className="border rounded">
        <div className="grid grid-cols-12 gap-2 p-2 text-sm font-semibold border-b">
          <div className="col-span-5">Desain</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">System</div>
          <div className="col-span-2">Fisik</div>
          <div className="col-span-1"></div>
        </div>

        {computed.map((r, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 p-2 border-b items-center">
            <div className="col-span-5">
              <select
                className="w-full border rounded p-2"
                value={r.productId}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, productId: v } : x)));
                }}
              >
                <option value="">Pilih desain...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <select
                className="w-full border rounded p-2"
                value={r.size}
                onChange={(e) => {
                  const v = e.target.value as Size;
                  setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, size: v } : x)));
                }}
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 text-sm">
              {r.variantId ? r.systemQty : "-"}
              {r.variantId ? <div className="text-xs opacity-60">diff: {r.diff >= 0 ? `+${r.diff}` : r.diff}</div> : null}
            </div>

            <div className="col-span-2">
              <NumberInput
                value={r.countedQty}
                onValueChange={(v) => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, countedQty: v } : x)))}
                placeholder="qty fisik"
              />
            </div>

            <div className="col-span-1">
              <button className="text-red-600 text-sm" onClick={() => removeRow(idx)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-4 py-2" onClick={addRow}>
          + Tambah Baris
        </button>

        <button className="bg-black text-white rounded px-4 py-2 disabled:opacity-50" onClick={submit} disabled={submitting}>
          {submitting ? "Menyimpan..." : "Submit Opname"}
        </button>
      </div>
    </div>
  );
}
