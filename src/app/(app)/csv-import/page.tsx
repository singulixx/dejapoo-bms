"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useNotify } from "@/components/ui/notify";

type Channel = "SHOPEE" | "TIKTOK";

export default function CsvImportPage() {
  const { toast } = useNotify();
  const [channel, setChannel] = useState<Channel>("SHOPEE");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ orderId: "", sku: "", qty: "", date: "", price: "" });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const mappedOk = useMemo(() => !!(mapping.orderId && mapping.sku && mapping.qty), [mapping]);

  async function onFile(f: File) {
    const text = await f.text();
    setCsvText(text);
    // best-effort header parse client-side
    const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || "";
    const cols = firstLine
      .split(",")
      .map((x) => x.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
    setHeaders(cols);

    // Attempt auto mapping by common names
    const lower = cols.map((c) => c.toLowerCase());
    const pick = (cands: string[]) => {
      for (const c of cands) {
        const i = lower.indexOf(c);
        if (i >= 0) return cols[i];
      }
      return "";
    };
    setMapping((m) => ({
      ...m,
      orderId: pick(["order id", "order_id", "ordersn", "order_sn", "order"]),
      sku: pick(["sku", "model_sku", "item_sku", "external skuid", "external_sku_id"]),
      qty: pick(["qty", "quantity", "amount"]),
      date: pick(["date", "created", "created_at", "order_time"]),
      price: pick(["price", "unit price", "item_price"]),
    }));
  }

  async function doPreview() {
    if (!csvText.trim()) {
      toast({ title: "CSV kosong", description: "Upload file CSV dulu", variant: "error" });
      return;
    }
    if (!mappedOk) {
      toast({ title: "Mapping belum lengkap", description: "Pilih kolom Order ID, SKU, dan Qty", variant: "error" });
      return;
    }
    setLoading(true);
    const res = await apiFetch("/api/import/csv-orders", {
      method: "POST",
      body: JSON.stringify({ channel, csvText, mode: "preview", mapping }),
    });
    const j = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Gagal", description: j?.message || "Gagal preview", variant: "error" });
      return;
    }
    setPreview(j);
    toast({ title: "Preview siap", description: `Order: ${j?.stats?.orders || 0} • Baris: ${j?.stats?.lines || 0}`, variant: "success" });
  }

  async function submit() {
    if (!preview) {
      toast({ title: "Belum ada preview", description: "Klik Preview dulu", variant: "error" });
      return;
    }
    setLoading(true);
    const res = await apiFetch("/api/import/csv-orders", {
      method: "POST",
      body: JSON.stringify({ channel, csvText, mode: "submit", mapping }),
    });
    const j = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Gagal", description: j?.message || "Gagal submit", variant: "error" });
      setPreview(j);
      return;
    }
    toast({ title: "Berhasil", description: `Berhasil import ${j?.createdCount || 0} order`, variant: "success" });
    setPreview(null);
  }

  const ColSelect = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <label className="space-y-1 text-sm">
      <div className="text-dark-5 dark:text-white/70">{label}</div>
      <select
        className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">- pilih kolom -</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">CSV Import Marketplace</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">
          Upload CSV order (manual) → Preview → Submit → otomatis buat Stock Out + StockMovement.
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <div className="text-dark-5 dark:text-white/70">Channel</div>
            <select
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              <option value="SHOPEE">Shopee</option>
              <option value="TIKTOK">TikTok Shop</option>
            </select>
          </label>

          <label className="md:col-span-2 space-y-1 text-sm">
            <div className="text-dark-5 dark:text-white/70">File CSV</div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <ColSelect label="Order ID" value={mapping.orderId} onChange={(v) => setMapping((m) => ({ ...m, orderId: v }))} />
          <ColSelect label="SKU" value={mapping.sku} onChange={(v) => setMapping((m) => ({ ...m, sku: v }))} />
          <ColSelect label="Qty" value={mapping.qty} onChange={(v) => setMapping((m) => ({ ...m, qty: v }))} />
          <ColSelect label="Tanggal (opsional)" value={mapping.date} onChange={(v) => setMapping((m) => ({ ...m, date: v }))} />
          <ColSelect label="Harga (opsional)" value={mapping.price} onChange={(v) => setMapping((m) => ({ ...m, price: v }))} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={doPreview}
            disabled={!csvText.trim() || !mappedOk || loading}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!preview || loading || (preview?.missingSkus?.length ?? 0) > 0 || (preview?.insufficient?.length ?? 0) > 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Submit
          </button>
          <a
            href="/integrations"
            className="rounded-xl border border-stroke dark:border-white/10 px-4 py-2 text-sm font-medium text-dark dark:text-white/80 hover:bg-gray-2/50 dark:hover:bg-white/5"
          >
            Buka SKU Mapping
          </a>
        </div>
      </div>

      {preview ? (
        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4 space-y-3">
          <div className="text-sm text-dark-5 dark:text-white/70">Hasil Preview</div>
          <div className="grid gap-2 md:grid-cols-4 text-sm">
            <div>Order: <span className="font-semibold text-dark dark:text-white">{preview?.stats?.orders ?? 0}</span></div>
            <div>Baris: <span className="font-semibold text-dark dark:text-white">{preview?.stats?.lines ?? 0}</span></div>
            <div>Missing SKU: <span className="font-semibold text-dark dark:text-white">{preview?.missingSkus?.length ?? 0}</span></div>
            <div>Stok kurang: <span className="font-semibold text-dark dark:text-white">{preview?.insufficient?.length ?? 0}</span></div>
          </div>

          {(preview?.missingSkus?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-stroke dark:border-white/10 p-3 text-sm">
              <div className="font-medium text-yellow-300">SKU belum di-mapping</div>
              <div className="mt-1 text-dark-6 dark:text-white/50">
                Tambahkan mapping dulu di menu <b>Integrasi</b>.
              </div>
              <div className="mt-2 font-mono text-xs whitespace-pre-wrap">{preview.missingSkus.join(", ")}</div>
            </div>
          ) : null}

          {(preview?.insufficient?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-stroke dark:border-white/10 p-3 text-sm">
              <div className="font-medium text-yellow-300">Stok tidak cukup</div>
              <div className="mt-2 text-xs text-dark-6 dark:text-white/50">Kurangi qty / lakukan penyesuaian stok dulu.</div>
            </div>
          ) : null}

          {preview?.sample?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-dark-5 dark:text-white/70">
                    <th className="py-2">Order ID</th>
                    <th className="py-2">Items (sku:qty)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((o: any) => (
                    <tr key={o.orderId} className="border-t border-stroke dark:border-white/10">
                      <td className="py-2 font-mono">{o.orderId}</td>
                      <td className="py-2 font-mono text-xs">
                        {o.items.map((it: any) => `${it.externalSkuId}:${it.qty}`).join(" • ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
