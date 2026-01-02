"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useNotify } from "@/components/ui/notify";

type Channel = "SHOPEE" | "TIKTOK";

const CHANNELS: Channel[] = ["SHOPEE", "TIKTOK"];

function classBtn(active: boolean) {
  return active
    ? "rounded-xl bg-primary text-white px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
    : "rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-white/90 border border-primary/30 px-3 py-1.5 text-sm hover:bg-primary/20";
}

export default function IntegrationsPage() {
  const { toast, confirm } = useNotify();
  const [channel, setChannel] = useState<Channel>("SHOPEE");
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    setOrigin(window.location.origin);
    loadShopeeStatus();
  }, []);
  const [tab, setTab] = useState<"events" | "mapping">("events");

  const [shopeeStatus, setShopeeStatus] = useState<any>(null);
  const [testingShopee, setTestingShopee] = useState(false);
  const loadShopeeStatus = async () => {
    try {
      const res = await apiFetch("/api/integrations/shopee/status");
      const j = res.ok ? await res.json() : null;
      setShopeeStatus(j);
    } catch {
      setShopeeStatus(null);
    }
  };

  // Data
  const [events, setEvents] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [unmappedSkus, setUnmappedSkus] = useState<any[]>([]);
  const [loadingUnmapped, setLoadingUnmapped] = useState(false);

  // Mapping form
  const [externalSkuId, setExternalSkuId] = useState("");
  const [variantId, setVariantId] = useState("");

  async function loadProducts() {
    const res = await apiFetch("/api/products?pageSize=200&includeInactive=1");
    const j = res.ok ? await res.json() : { items: [] };
    setProducts(j.items || []);
  }

  async function loadEvents() {
    setLoadingEvents(true);
    const res = await apiFetch(`/api/integrations/webhook-events?channel=${channel}&take=100`);
    const j = res.ok ? await res.json() : { items: [] };
    setEvents(j.items || []);
    setLoadingEvents(false);
  }

  async function loadMaps() {
    setLoadingMaps(true);
    const res = await apiFetch(`/api/integrations/sku-map?channel=${channel}`);
    const j = res.ok ? await res.json() : { items: [] };
    setMaps(j.items || []);
    setLoadingMaps(false);
  }

async function loadUnmapped() {
  setLoadingUnmapped(true);
  const res = await apiFetch(`/api/integrations/unmapped-skus?channel=${channel}&take=300`);
  const j = res.ok ? await res.json() : { items: [] };
  setUnmappedSkus(j.items || []);
  setLoadingUnmapped(false);
}

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadEvents();
    loadMaps();
    loadUnmapped();
  }, [channel]);

  const allVariants = useMemo(() => {
    const out: Array<{ id: string; label: string }> = [];
    for (const p of products) {
      for (const v of (p.variants || [])) {
        out.push({ id: v.id, label: `${p.name} • ${v.size} • ${v.sku}` });
      }
    }
    return out;
  }, [products]);

  async function saveMap() {
    if (!externalSkuId.trim() || !variantId) {
      toast({ title: "Tidak lengkap", description: "External SKU dan Variant wajib diisi", variant: "error" });
      return;
    }
    const res = await apiFetch("/api/integrations/sku-map", {
      method: "POST",
      body: JSON.stringify({ channel, externalSkuId: externalSkuId.trim(), variantId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: "Gagal", description: j?.message || "Gagal menyimpan mapping", variant: "error" });
      return;
    }
    setExternalSkuId("");
    setVariantId("");
    await loadMaps();
    await loadUnmapped();
    // try reprocess unmapped events quickly
    await loadEvents();
    toast({ title: "Berhasil", description: "Mapping disimpan", variant: "success" });
  }

  async function deleteMap(id: string) {
    const ok = await confirm({ title: "Hapus mapping?", description: "Mapping ini akan dihapus.", confirmText: "Hapus", cancelText: "Batal", destructive: true });
    if (!ok) return;
    const res = await apiFetch(`/api/integrations/sku-map/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal hapus mapping", variant: "error" });
      return;
    }
    await loadMaps();
    await loadUnmapped();
    toast({ title: "Terhapus", description: "Mapping berhasil dihapus", variant: "success" });
  }

  async function retryEvent(id: string) {
    const res = await apiFetch(`/api/integrations/webhook-events`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ title: "Gagal", description: j?.message || "Retry gagal", variant: "error" });
    } else {
      toast({ title: "Berhasil", description: "Event diproses ulang", variant: "success" });
    }
    await loadEvents();
  }

  const webhookUrl = origin
    ? `${origin}/api/integrations/${channel === "SHOPEE" ? "shopee" : "tiktok"}/webhook`
    : `/api/integrations/${channel === "SHOPEE" ? "shopee" : "tiktok"}/webhook`;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrasi Marketplace</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">
          Webhook untuk TikTok Shop & Shopee + mapping SKU ke varian internal.
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {CHANNELS.map((c) => (
            <button key={c} className={classBtn(channel === c)} onClick={() => setChannel(c)}>
              {c === "SHOPEE" ? "Shopee" : "TikTok Shop"}
            </button>
          ))}
          <div className="mx-2 h-6 w-px bg-stroke dark:bg-card/10" />
          <button className={classBtn(tab === "events")} onClick={() => setTab("events")}>Webhook Events</button>
          <button className={classBtn(tab === "mapping")} onClick={() => setTab("mapping")}>Mapping SKU</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-stroke dark:border-white/10 p-3">
            <div className="text-xs text-dark-5 dark:text-white/60">Webhook URL</div>
            <div className="mt-1 font-mono text-xs break-all">{webhookUrl}</div>
          </div>
          <div className="rounded-xl border border-stroke dark:border-white/10 p-3">
            <div className="text-xs text-dark-5 dark:text-white/60">Auth Header</div>
            <div className="mt-1 font-mono text-xs">x-webhook-secret: (set di Vercel env)</div>
            <div className="mt-1 text-xs text-dark-6 dark:text-white/40">
              Env: {channel === "SHOPEE" ? "WEBHOOK_SECRET_SHOPEE" : "WEBHOOK_SECRET_TIKTOK"}
            </div>
          </div>
        </div>

        {channel === "SHOPEE" ? (
          <div className="mt-4 rounded-xl border border-stroke dark:border-white/10 p-3">
            <div className="text-sm font-semibold">Shopee OAuth (Production)</div>
            <div className="mt-1 text-xs text-dark-6 dark:text-white/40">
              Pastikan env <span className="font-mono">SHOPEE_PARTNER_ID</span>, <span className="font-mono">SHOPEE_PARTNER_KEY</span>, dan <span className="font-mono">SHOPEE_REDIRECT_URL</span> sudah di-set.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              
              <button
                onClick={() => window.open(`/api/integrations/shopee/connect`, "_blank")}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Connect Shopee
              </button>

              <button
                onClick={async () => {
                  setTestingShopee(true);
                  try {
                    const res = await apiFetch("/api/integrations/shopee/test");
                    const j = res.ok ? await res.json() : await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast({ title: "Tes koneksi gagal", description: j?.message || "Tidak bisa konek ke Shopee" });
                    } else {
                      toast({ title: "Tes koneksi berhasil", description: `shop_id: ${j?.shop_id ?? "-"}` });
                    }
                  } catch (e: any) {
                    toast({ title: "Tes koneksi gagal", description: e?.message || "Error" });
                  } finally {
                    setTestingShopee(false);
                    loadShopeeStatus();
                  }
                }}
                disabled={testingShopee}
                className="rounded-xl bg-primary/10 text-primary dark:bg-primary/20 border border-primary/30 px-3 py-2 text-sm font-medium hover:bg-primary/20 disabled:opacity-60"
              >
                {testingShopee ? "Testing..." : "Test Connection"}
              </button>

              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Disconnect Shopee?",
                    description: "Akun marketplace Shopee akan dinonaktifkan dari sistem.",
                    confirmText: "Disconnect",
                  });
                  if (!ok) return;
                  await apiFetch("/api/integrations/shopee/disconnect", { method: "POST" });
                  toast({ title: "Shopee disconnected" });
                  loadShopeeStatus();
                }}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Disconnect
              </button>
              <div className="text-xs text-dark-6 dark:text-white/40">
                Akan membuka halaman otorisasi Shopee, lalu kembali ke aplikasi.
              </div>
              <div className="text-xs text-dark-6 dark:text-white/50">
                Status:{" "}
                {shopeeStatus?.connected ? (
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Connected (shop_id: {shopeeStatus?.shop_id ?? "-"})
                  </span>
                ) : (
                  <span className="font-medium text-dark-6 dark:text-white/60">Not connected</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {tab === "events" ? (
        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Webhook Events</div>
              <div className="text-xs text-dark-6 dark:text-white/40">Tampil 100 event terakhir untuk channel terpilih.</div>
            </div>
            <button onClick={loadEvents} className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90">
              Refresh
            </button>
          </div>

          {loadingEvents ? <div className="mt-3 text-sm text-dark-5 dark:text-white/60">Loading...</div> : null}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm text-dark dark:text-white/90">
              <thead className="text-dark-5 dark:text-white/60">
                <tr>
                  <th className="py-2 text-left">Waktu</th>
                  <th className="py-2 text-left">External Order</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Error</th>
                  <th className="py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-stroke dark:border-white/10">
                    <td className="py-2 whitespace-nowrap">{new Date(e.receivedAt).toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{e.externalOrderId || "-"}</td>
                    <td className="py-2">{e.status}</td>
                    <td className="py-2 max-w-[420px] truncate" title={e.errorMessage || ""}>{e.errorMessage || "-"}</td>
                    <td className="py-2">
                      {e.status === "UNMAPPED" || e.status === "ERROR" ? (
                        <button onClick={() => retryEvent(e.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90">
                          Retry
                        </button>
                      ) : (
                        <span className="text-xs text-dark-6 dark:text-white/40">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-dark-5 dark:text-white/60" colSpan={5}>
                      Belum ada event.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Mapping SKU</div>
              <div className="text-xs text-dark-6 dark:text-white/40">Mapping SKU marketplace → varian (ukuran) internal.</div>
            </div>
            <button onClick={loadMaps} className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90">
              Refresh
            </button>
          </div>

<div className="mt-4 rounded-2xl border border-stroke dark:border-white/10 bg-gray-2/40 dark:bg-black/20 p-3">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm font-semibold">SKU yang belum dimapping</div>
      <div className="text-xs text-dark-5 dark:text-white/60">
        Ambil dari webhook event yang status-nya <span className="font-mono">UNMAPPED</span>. Klik salah satu SKU untuk mengisi form otomatis.
      </div>
    </div>
    <button
      onClick={loadUnmapped}
      className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
    >
      Refresh
    </button>
  </div>

  {loadingUnmapped ? (
    <div className="mt-2 text-sm text-dark-5 dark:text-white/60">Loading...</div>
  ) : unmappedSkus.length === 0 ? (
    <div className="mt-2 text-sm text-dark-5 dark:text-white/60">Tidak ada SKU yang belum dimapping.</div>
  ) : (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs text-dark dark:text-white/90">
        <thead className="text-dark-5 dark:text-white/60">
          <tr>
            <th className="py-2 text-left">External SKU</th>
            <th className="py-2 text-left">Terlihat</th>
            <th className="py-2 text-left">Terakhir</th>
            <th className="py-2 text-left">Contoh Order</th>
            <th className="py-2 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {unmappedSkus.slice(0, 50).map((u) => (
            <tr key={u.externalSkuId} className="border-t border-stroke dark:border-white/10">
              <td className="py-2 font-mono">{u.externalSkuId}</td>
              <td className="py-2">{u.count}x</td>
              <td className="py-2 whitespace-nowrap">{new Date(u.lastSeenAt).toLocaleString()}</td>
              <td className="py-2 font-mono">{u.sampleOrderId || "-"}</td>
              <td className="py-2">
                <button
                  onClick={() => setExternalSkuId(String(u.externalSkuId))}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                >
                  Pakai
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {unmappedSkus.length > 50 ? (
        <div className="mt-2 text-xs text-dark-5 dark:text-white/60">Menampilkan 50 dari {unmappedSkus.length} SKU.</div>
      ) : null}
    </div>
  )}
</div>

<div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none"
              value={externalSkuId}
              onChange={(e) => setExternalSkuId(e.target.value)}
              placeholder="External SKU ID (dari marketplace)"
            />
            <select
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">Pilih varian internal…</option>
              {allVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <button onClick={saveMap} className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">
              Simpan Mapping
            </button>
          </div>

          {loadingMaps ? <div className="mt-3 text-sm text-dark-5 dark:text-white/60">Loading...</div> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-dark dark:text-white/90">
              <thead className="text-dark-5 dark:text-white/60">
                <tr>
                  <th className="py-2 text-left">External SKU</th>
                  <th className="py-2 text-left">Varian Internal</th>
                  <th className="py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {maps.map((m) => (
                  <tr key={m.id} className="border-t border-stroke dark:border-white/10">
                    <td className="py-2 font-mono text-xs">{m.externalSkuId}</td>
                    <td className="py-2">
                      {m.variant?.product?.name} • {m.variant?.size} • <span className="font-mono text-xs">{m.variant?.sku}</span>
                    </td>
                    <td className="py-2">
                      <button onClick={() => deleteMap(m.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {maps.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-dark-5 dark:text-white/60" colSpan={3}>
                      Belum ada mapping.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}