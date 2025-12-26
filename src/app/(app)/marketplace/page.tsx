"use client";

import { useEffect, useState } from "react";
import { useNotify } from "@/components/ui/notify";
import { apiFetch } from "@/lib/client";
import { StatusPill } from "@/components/ui/status-pill";

export default function MarketplacePage() {
  const { toast } = useNotify();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [channel, setChannel] = useState<"SHOPEE"|"TIKTOK">("SHOPEE");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState('{"apiKey":"","secret":""}');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/api/marketplace/accounts");
    const j = res.ok ? await res.json() : { items: [] };
    setAccounts(j.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function connect() {
    let parsed: any = null;
    try { parsed = JSON.parse(credentials); } catch {
      toast({ title: "Tidak valid", description: "Credentials harus JSON valid", variant: "error" });
      return;
    }
    const res = await apiFetch("/api/marketplace/accounts", {
      method: "POST",
      body: JSON.stringify({ channel, name: name || null, credentials: parsed }),
    });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal connect", variant: "error" });
      return;
    }
    toast({ title: "Berhasil", description: "Akun marketplace tersimpan", variant: "success" });
    setName("");
    setCredentials('{"apiKey":"","secret":""}');
    await load();
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <div className="text-sm text-dark-5 dark:text-white/60">Connect akun + mapping SKU (UI stub)</div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Connect Akun</div>
        <div className="grid gap-3 md:grid-cols-2">
          <select className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none" value={channel} onChange={(e)=>setChannel(e.target.value as any)}>
            <option value="SHOPEE">Shopee</option>
            <option value="TIKTOK">TikTok Shop</option>
          </select>
          <input className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nama akun (opsional)" />
          <textarea placeholder="Tulis keterangan"
            className="md:col-span-2 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/10 px-3 py-2 outline-none font-mono text-xs"
            value={credentials}
            onChange={(e)=>setCredentials(e.target.value)}
            rows={6}
            placeholder="Credentials (opsional)\nMis: {\"token\":\"...\"}"
          />
        </div>
        <div className="mt-3">
          <button onClick={connect} className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">Simpan</button>
        </div>
        <div className="mt-3 text-xs text-dark-6 dark:text-white/40">
          Catatan: sync order/produk/stok & refresh token akan ditambahkan via Vercel Cron (stub backend).
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/10 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Akun Terhubung</div>
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr><th className="py-2 text-left">Channel</th><th className="py-2 text-left">Nama</th><th className="py-2 text-left">Status</th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-stroke dark:border-white/10">
                  <td className="py-2">{a.channel}</td>
                  <td className="py-2">{a.name || "-"}</td>
                  <td className="py-2"><StatusPill active={a.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}