"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client";
import { Pagination } from "@/components/ui/Pagination";
import CurrencyInput from "@/components/FormElements/CurrencyInput";
import { formatRupiah, parseRupiah } from "@/lib/rupiah";
import { useNotify } from "@/components/ui/notify";
import { StatusPill } from "@/components/ui/status-pill";

type Product = {
  id: string;
  name: string;
  code: string | null;
  category: string;
  description: string | null;
  imageUrl: string | null;
  costPrice: number;
  sellPrice: number;
  isActive: boolean;
  variants?: any[];
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium " +
        (active
          ? "bg-primary text-white"
          : "bg-gray-2/60 text-dark-5 dark:bg-black/20 dark:text-white/70")
      }
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Tutup"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-2xl bg-primary bg-black/70 backdrop-blur p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
          >
            Tutup
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { toast, confirm } = useNotify();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Kaos");
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [eName, setEName] = useState("");
  const [eCode, setECode] = useState("");
  const [eCategory, setECategory] = useState("Kaos");
  const [eDescription, setEDescription] = useState("");
  const [eCostPrice, setECostPrice] = useState<number>(0);
  const [eSellPrice, setESellPrice] = useState<number>(0);
  const [eImageUrl, setEImageUrl] = useState("");
  const [eImageFile, setEImageFile] = useState<File | null>(null);
  const [eIsActive, setEIsActive] = useState(true);

  async function uploadIfNeeded(file: File | null) {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const up = await apiFetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) {
      const j = await up.json().catch(() => ({}));
      throw new Error(j?.message || "Gagal upload foto");
    }
    const j = await up.json();
    return j?.url as string;
  }

  async function load(next?: { page?: number; pageSize?: number; q?: string; includeInactive?: boolean }) {
    setLoading(true);
    setErr(null);
    const qp = next?.q ?? q;
    const pp = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;
    const ii = next?.includeInactive ?? includeInactive;
    const res = await apiFetch(
      `/api/products?includeInactive=${ii ? 1 : 0}&q=${encodeURIComponent(qp)}&page=${pp}&pageSize=${ps}`
    );
    if (!res.ok) {
      setErr("Gagal memuat produk");
      setLoading(false);
      return;
    }
    const j = await res.json();
    setItems(j.items || []);
    setPagination(j.pagination || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // refresh when filters change
    load({ page: 1 });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  async function create() {
    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadIfNeeded(imageFile);
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.message || "Gagal upload foto", variant: "error" });
      return;
    }
    const res = await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name,
        code: code || null,
        category,
        description: description || null,
        imageUrl: uploadedUrl ?? (imageUrl || null),
        costPrice: Math.max(0, costPrice || 0),
        sellPrice: Math.max(0, sellPrice || 0),
        isActive: true,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: "Gagal", description: j?.message || "Gagal membuat produk", variant: "error" });
      return;
    }
    setName("");
    setCode("");
    setDescription("");
    setImageUrl("");
    setCostPrice(0);
    setSellPrice(0);
    setImageFile(null);
    await load();
    toast({ title: "Berhasil", description: "Desain berhasil dibuat", variant: "success" });
  }

  function openEdit(p: Product) {
    setEditing(p);
    setEName(p.name);
    setECode(p.code || "");
    setECategory(p.category);
    setEDescription(p.description || "");
    setEImageUrl(p.imageUrl || "");
    setECostPrice(p.costPrice ?? 0);
    setESellPrice(p.sellPrice ?? 0);
    setEImageFile(null);
    setEIsActive(p.isActive);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;

    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadIfNeeded(eImageFile);
    } catch (e: any) {
      toast({ title: "Gagal", description: e?.message || "Gagal upload foto", variant: "error" });
      return;
    }

    const res = await apiFetch(`/api/products/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: eName,
        code: eCode ? eCode : null,
        category: eCategory,
        description: eDescription ? eDescription : null,
        imageUrl: uploadedUrl ?? (eImageUrl ? eImageUrl : null),
        costPrice: Math.max(0, eCostPrice || 0),
        sellPrice: Math.max(0, eSellPrice || 0),
        isActive: eIsActive,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: "Gagal", description: j?.message || "Gagal update produk", variant: "error" });
      return;
    }
    setEditOpen(false);
    setEditing(null);
    await load();
    toast({ title: "Berhasil", description: "Perubahan tersimpan", variant: "success" });
  }

  async function toggleActive(p: Product) {
    const res = await apiFetch(`/api/products/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal mengubah status", variant: "error" });
      return;
    }
    await load();
    toast({ title: "Berhasil", description: p.isActive ? "Desain dinonaktifkan" : "Desain diaktifkan", variant: "success" });
  }

  async function softDelete(p: Product) {
    const ok = await confirm({
      title: `Hapus desain?`,
      description: `Desain "${p.name}" akan dihapus (soft delete).`,
      confirmText: "Hapus",
      cancelText: "Batal",
      destructive: true,
    });
    if (!ok) return;
    const res = await apiFetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal menghapus produk", variant: "error" });
      return;
    }
    await load();
    toast({ title: "Terhapus", description: "Desain berhasil dihapus", variant: "success" });
  }

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Desain</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">Stok disimpan per desain + ukuran (S–XXL)</div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <label className="flex items-center gap-2 text-sm text-dark-5 dark:text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4 accent-white"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Tampilkan nonaktif
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk / kode / kategori"
            className="w-full md:w-80 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
          />
          <button
            onClick={() => {
              setPage(1);
              load({ page: 1, q });
            }}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            Cari
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Tambah Desain</div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none" placeholder="Nama desain" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none" placeholder="Kode desain (opsional)" value={code} onChange={(e)=>setCode(e.target.value)} />
          <input className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none" placeholder="Kategori (Kaos, Hoodie, ...)" value={category} onChange={(e)=>setCategory(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              prefix
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
              placeholder="Harga modal"
              value={costPrice}
              onValueChange={setCostPrice}
            />
            <CurrencyInput
              prefix
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
              placeholder="Harga jual"
              value={sellPrice}
              onValueChange={setSellPrice}
            />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <div className="text-xs text-dark-6 dark:text-white/50">Foto desain (upload). Kamu juga bisa isi URL kalau tidak upload.</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="file"
                accept="image/*"
                className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <input
                className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                placeholder="URL foto (opsional)"
                value={imageUrl}
                onChange={(e)=>setImageUrl(e.target.value)}
              />
            </div>
            {imageFile ? (
              <div className="text-xs text-dark-6 dark:text-white/50">File dipilih: {imageFile.name}</div>
            ) : null}
          </div>

          <textarea className="md:col-span-2 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none" placeholder="Catatan/deskripsi (opsional)" value={description} onChange={(e)=>setDescription(e.target.value)} />
        </div>
        <div className="mt-3">
          <button
            onClick={create}
            disabled={!name || !category}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
          >
            Simpan Desain
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Daftar Desain</div>
        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}
        {err ? <div className="text-red-400">{err}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr>
                <th className="py-2 text-left">Nama</th>
                <th className="py-2 text-left">Kode</th>
                <th className="py-2 text-left">Kategori</th>
                <th className="py-2 text-left">Foto</th>
                <th className="py-2 text-right">Harga Modal</th>
                <th className="py-2 text-right">Harga Jual</th>
                <th className="py-2 text-right">Ukuran</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-stroke dark:border-white/20">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-dark-5 dark:text-white/70">{p.code || "-"}</td>
                  <td className="py-2">{p.category}</td>
                  <td className="py-2">
                    {p.imageUrl ? (
                      <a
                        className="text-primary hover:text-primary/80 underline dark:text-white/70 dark:hover:text-white"
                        href={p.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lihat
                      </a>
                    ) : (
                      <span className="text-dark-6 dark:text-white/40">-</span>
                    )}
                  </td>
                  <td className="py-2 text-right">{formatRupiah(p.costPrice)}</td>
                  <td className="py-2 text-right">{formatRupiah(p.sellPrice)}</td>
                  <td className="py-2 text-right">S, M, L, XL, XXL</td>
                  <td className="py-2"><Badge active={p.isActive} /></td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => softDelete(p)}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination className="mt-4" page={page} pageSize={pageSize} total={pagination?.total ?? 0} disabled={loading} onPageChange={(p) => { setPage(p); load({ page: p }); }} onPageSizeChange={(s) => { setPage(1); setPageSize(s); load({ page: 1, pageSize: s }); }} />

            <button
              disabled={loading || (pagination ? page >= pagination.totalPages : false)}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                load({ page: nextPage });
              }}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
            >
              Next
            </button>
      </div>

      </div>

      <Modal
        open={editOpen}
        title={editing ? `Edit Desain — ${editing.name}` : "Edit Desain"}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            placeholder="Nama desain"
            value={eName}
            onChange={(e) => setEName(e.target.value)}
          />
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            placeholder="Kode desain (opsional)"
            value={eCode}
            onChange={(e) => setECode(e.target.value)}
          />
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            placeholder="Kategori"
            value={eCategory}
            onChange={(e) => setECategory(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              prefix
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
              placeholder="Harga modal"
              value={eCostPrice}
              onValueChange={setECostPrice}
            />
            <CurrencyInput
              prefix
              className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
              placeholder="Harga jual"
              value={eSellPrice}
              onValueChange={setESellPrice}
            />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <div className="text-xs text-dark-6 dark:text-white/50">Foto desain (upload). Kamu juga bisa isi URL kalau tidak upload.</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="file"
                accept="image/*"
                className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                onChange={(e) => setEImageFile(e.target.files?.[0] || null)}
              />
              <input
                className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
                placeholder="URL foto (opsional)"
                value={eImageUrl}
                onChange={(e) => setEImageUrl(e.target.value)}
              />
            </div>
            {eImageFile ? <div className="text-xs text-dark-6 dark:text-white/50">File dipilih: {eImageFile.name}</div> : null}
          </div>
          <textarea
            className="md:col-span-2 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            placeholder="Deskripsi (opsional)"
            value={eDescription}
            onChange={(e) => setEDescription(e.target.value)}
          />

          <label className="md:col-span-2 flex items-center gap-2 text-sm text-dark-5 dark:text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4 accent-white"
              checked={eIsActive}
              onChange={(e) => setEIsActive(e.target.checked)}
            />
            Desain aktif (desain nonaktif tidak bisa dipakai transaksi)
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setEditOpen(false);
              setEditing(null);
            }}
            className="rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 px-4 py-2 text-sm text-primary dark:text-white/90 hover:bg-primary/20 dark:hover:bg-primary/30"
          >
            Batal
          </button>
          <button
            onClick={saveEdit}
            disabled={!eName || !eCategory}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
          >
            Simpan Perubahan
          </button>
        </div>
      </Modal>
    </div>
  );
}