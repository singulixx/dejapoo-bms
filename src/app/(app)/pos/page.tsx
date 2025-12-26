"use client";

import { useEffect, useMemo, useState } from "react";
import NumberInput from "@/components/FormElements/NumberInput";
import { apiFetch } from "@/lib/client";
import { useNotify } from "@/components/ui/notify";

type Size = "S" | "M" | "L" | "XL" | "XXL";
type Payment = "CASH" | "TRANSFER" | "QRIS";

type Variant = { id: string; size: Size; sku: string; price: number; isActive: boolean };
type Product = { id: string; name: string; category: string; sellPrice: number; isActive: boolean; variants: Variant[] };

type Row = { productId: string; size: Size; qty: number };

const SIZES: Size[] = ["S", "M", "L", "XL", "XXL"];

export default function PosPage() {
  const { toast } = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<Payment>("CASH");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>("");
  // qty default 0 supaya placeholder muncul (lebih enak dihapus/diisi ulang)
  const [rows, setRows] = useState<Row[]>([{ productId: "", size: "S", qty: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch("/api/products?includeInactive=0&paginate=0");
      const j = res.ok ? await res.json() : { items: [] };
      setProducts(j.items || []);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const total = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      const p = products.find((x) => x.id === r.productId);
      if (!p) continue;
      const v = p.variants?.find((vv) => vv.size === r.size && vv.isActive);
      const price = (v?.price ?? p.sellPrice ?? 0) || 0;
      sum += price * (r.qty || 0);
    }
    return sum;
  }, [rows, products]);

  function addRow() {
    setRows((prev) => [...prev, { productId: "", size: "S", qty: 0 }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setErr(null);
    const items = rows
      .filter((r) => r.productId && r.qty > 0)
      .map((r) => {
        const p = products.find((x) => x.id === r.productId)!;
        const v = p.variants?.find((vv) => vv.size === r.size && vv.isActive);
        return { productId: r.productId, variantId: v?.id, qty: r.qty, price: (v?.price ?? p.sellPrice ?? 0) || 0 };
      });

    if (!items.length) {
      setErr("Tambahkan minimal 1 item.");
      return;
    }
    if (items.some((it) => !it.variantId)) {
      setErr("Varian ukuran tidak ditemukan. Pastikan desain sudah auto S–XXL.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        paymentMethod,
        note: note || undefined,
        date: new Date(date + "T00:00:00.000Z").toISOString(),
        items,
      };
      const res = await apiFetch("/api/orders/offline", { method: "POST", body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j?.error || "Gagal simpan transaksi";
        setErr(msg);
        toast({ title: "Gagal", description: msg, variant: "error" });
        return;
      }
      toast({ title: "Berhasil", description: "Transaksi tersimpan", variant: "success" });
      setRows([{ productId: "", size: "S", qty: 0 }]);
      setNote("");
    } catch (e: any) {
      const msg = e?.message || "Gagal simpan transaksi";
      setErr(msg);
      toast({ title: "Gagal", description: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">POS Offline</h1>
        <p className="text-sm text-dark-5 dark:text-white/60">
          Transaksi offline dicatat lewat POS. Shopee & TikTok Shop dicatat lewat <b>Barang Keluar</b>.
        </p>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Tanggal</label>
            <input
              className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Pilih tanggal"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <select className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as Payment)}>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Catatan (opsional)</label>
            <input className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis: kasir A" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Item</div>
          <button className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90" onClick={addRow}>
            + Tambah
          </button>
        </div>

        {err && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">{err}</div>}

        {loading ? (
          <div className="mt-4 text-sm text-dark-5 dark:text-white/60">Memuat desain...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-6">
                  <label className="text-xs text-dark-5 dark:text-white/60">Desain</label>
                  <select className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm" value={r.productId} onChange={(e) => updateRow(i, { productId: e.target.value })}>
                    <option value="">Pilih desain...</option>
                    {products.filter((p) => p.isActive !== false).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-dark-5 dark:text-white/60">Ukuran</label>
                  <select className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm" value={r.size} onChange={(e) => updateRow(i, { size: e.target.value as Size })}>
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-dark-5 dark:text-white/60">Qty</label>
                  <NumberInput
                    className="mt-1 w-full rounded-xl border border-stroke dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                    value={r.qty}
                    // biarkan kosong/0 saat input (validasi qty>0 dilakukan saat submit)
                    min={0}
                    placeholder="Qty"
                    onValueChange={(v) => updateRow(i, { qty: v })}
                  />
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:bg-gray-2 disabled:text-dark-5 disabled:hover:bg-gray-2 disabled:opacity-100 dark:disabled:bg-black/40 dark:disabled:text-dark-6" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm">
            Total: <b>Rp {total.toLocaleString("id-ID")}</b>
          </div>
          <button
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
            onClick={submit}
            disabled={submitting || loading}
          >
            {submitting ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </div>
      </div>
    </div>
  );
}
