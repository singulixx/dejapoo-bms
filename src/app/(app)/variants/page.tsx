"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client";
import Pagination from "@/components/ui/Pagination";
import CurrencyInput from "@/components/FormElements/CurrencyInput";
import NumberInput from "@/components/FormElements/NumberInput";
import { formatRupiah } from "@/lib/rupiah";
import { useNotify } from "@/components/ui/notify";
import { StatusPill } from "@/components/ui/status-pill";
import EmptyState from "@/components/EmptyState";

type Product = { id: string; name: string; code: string | null };
type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string | null;
  price: number;
  minQty: number;
  isActive: boolean;
  productId: string;
  product: { id: string; name: string; code: string | null };
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs border " +
        (active
          ? "border-stroke dark:border-white/15 bg-gray-2 dark:bg-card/10 text-dark dark:text-white"
          : "border-stroke dark:border-white/10 bg-gray-2/60 dark:bg-black/20 text-dark-5 dark:text-white/70")
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
      <button aria-label="Tutup" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-primary bg-black/70 backdrop-blur p-4 shadow-2xl">
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

function slugSKU(s: string) {
  return s
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 32);
}

function autoSKU(p?: Product | null, size?: string, color?: string) {
  const base = p?.code?.trim() || p?.name?.trim() || "PRODUCT";
  const bits = [base, size || "M", color?.trim() || ""]
    .filter(Boolean)
    .map((x) => slugSKU(String(x)));
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return slugSKU([...bits, rand].join("-"));
}

export default function VariantsPage() {
  const { toast, confirm } = useNotify();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Variant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // create form
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("M");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(150000);
  const [color, setColor] = useState("");
  const [minQty, setMinQty] = useState<string>("");

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [eSize, setESize] = useState("M");
  const [eSku, setESku] = useState("");
  const [ePrice, setEPrice] = useState(150000);
  const [eColor, setEColor] = useState("");
  const [eMinQty, setEMinQty] = useState<string>("");
  const [eIsActive, setEIsActive] = useState(true);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  async function load(next?: {
    page?: number;
    pageSize?: number;
    q?: string;
    includeInactive?: boolean;
    productId?: string;
  }) {
    setLoading(true);
    setErr(null);

    const qp = next?.q ?? q;
    const pp = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;
    const ii = next?.includeInactive ?? includeInactive;
    const pid = next?.productId ?? filterProductId;

    const [pRes, vRes] = await Promise.all([
      apiFetch(`/api/products?includeInactive=1&pageSize=200`),
      apiFetch(
        `/api/variants?includeInactive=${ii ? 1 : 0}&q=${encodeURIComponent(qp)}&productId=${encodeURIComponent(
          pid
        )}&page=${pp}&pageSize=${ps}`
      ),
    ]);

    if (!pRes.ok) {
      setErr("Gagal memuat produk");
      setLoading(false);
      return;
    }
    if (!vRes.ok) {
      setErr("Gagal memuat varian");
      setLoading(false);
      return;
    }

    const pJson = await pRes.json();
    const vJson = await vRes.json();
    setProducts(pJson.items || []);
    setItems(vJson.items || []);
    setPagination(vJson.pagination || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  async function create() {
    const res = await apiFetch("/api/variants", {
      method: "POST",
      body: JSON.stringify({
        productId,
        size,
        sku,
        price: Number(price),
        color: color || null,
        minQty: Math.max(0, Number(minQty || 0)),
        isActive: true,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: "Gagal", description: j?.message || j?.error || "Gagal membuat varian", variant: "error" });
      return;
    }
    setSku("");
    setColor("");
    setMinQty("");
    await load();
    toast({ title: "Berhasil", description: "Varian berhasil dibuat", variant: "success" });
  }

  function openEdit(v: Variant) {
    setEditing(v);
    setESize(v.size);
    setESku(v.sku);
    setEPrice(v.price);
    setEColor(v.color || "");
    setEMinQty(v.minQty ? String(v.minQty) : "");
    setEIsActive(v.isActive);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await apiFetch(`/api/variants/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        size: eSize,
        sku: eSku,
        price: Number(ePrice),
        color: eColor ? eColor : null,
        minQty: Math.max(0, Number(eMinQty || 0)),
        isActive: eIsActive,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({ title: "Gagal", description: j?.message || j?.error || "Gagal update varian", variant: "error" });
      return;
    }
    setEditOpen(false);
    setEditing(null);
    await load();
    toast({ title: "Berhasil", description: "Perubahan tersimpan", variant: "success" });
  }

  async function toggleActive(v: Variant) {
    const res = await apiFetch(`/api/variants/${v.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal mengubah status", variant: "error" });
      return;
    }
    await load();
    toast({ title: "Berhasil", description: v.isActive ? "Varian dinonaktifkan" : "Varian diaktifkan", variant: "success" });
  }

  async function softDelete(v: Variant) {
    const ok = await confirm({
      title: "Hapus varian?",
      description: `Varian SKU "${v.sku}" akan dihapus (soft delete).`,
      confirmText: "Hapus",
      cancelText: "Batal",
      destructive: true,
    });
    if (!ok) return;
    const res = await apiFetch(`/api/variants/${v.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Gagal", description: "Gagal menghapus varian", variant: "error" });
      return;
    }
    await load();
    toast({ title: "Terhapus", description: "Varian berhasil dihapus", variant: "success" });
  }

  const canCreate = Boolean(productId && sku && size && Number(price) > 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Varian Produk</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">Size management (SKU unik)</div>
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
          <select
            className="w-full md:w-72 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
          >
            <option value="">Semua Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari SKU / size / warna / nama produk"
            className="w-full md:w-80 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
          />
          <button
            onClick={() => {
              setPage(1);
              load({ page: 1, q, productId: filterProductId });
            }}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            Cari
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white">{err}</div>
      ) : null}

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 text-sm text-dark-5 dark:text-white/70">Tambah Varian</div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Pilih Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU unik (wajib)"
            />
            <button
              type="button"
              onClick={() => {
                const p = productMap.get(productId);
                setSku(autoSKU(p, size, color));
              }}
              disabled={!productId}
              className="rounded-xl bg-primary px-3 py-2...disabled:hover:bg-muted"
              title="Auto-generate SKU"
            >
              Auto
            </button>
          </div>

          <select
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Warna (opsional)"
          />
          <CurrencyInput
            prefix
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            value={price}
            onValueChange={setPrice}
            placeholder="Harga jual"
          />
          <NumberInput
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={Number(minQty || 0)}
            min={0}
            placeholder="Min qty (stok menipis)"
            onValueChange={(v) => setMinQty(String(v))}
          />
        </div>
        <div className="mt-3">
          <button
            onClick={create}
            disabled={!canCreate}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-dark-5 dark:text-white/70">Daftar Varian</div>
        </div>

        {loading ? <div className="text-dark-5 dark:text-white/60">Loading...</div> : null}

        {items.length === 0 && !loading ? (
          <EmptyState
            title="Belum ada varian"
            description="Buat varian ukuran untuk setiap desain agar stok bisa dicatat."
            illustration="/empty/empty-variants.svg"
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm text-dark dark:text-white/90">
            <thead className="text-dark-5 dark:text-white/60">
              <tr>
                <th className="py-2 text-left">Produk</th>
                <th className="py-2 text-left">SKU</th>
                <th className="py-2 text-left">Size</th>
                <th className="py-2 text-left">Warna</th>
                <th className="py-2 text-right">Harga</th>
                <th className="py-2 text-right">Min</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-t border-stroke dark:border-white/20">
                  <td className="py-2">{v.product?.name || "-"}</td>
                  <td className="py-2 font-mono">{v.sku}</td>
                  <td className="py-2">{v.size}</td>
                  <td className="py-2 text-dark-5 dark:text-white/70">{v.color || "-"}</td>
                  <td className="py-2 text-right">{formatRupiah(v.price)}</td>
                  <td className="py-2 text-right">{v.minQty}</td>
                  <td className="py-2">
                    <Badge active={v.isActive} />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(v)}
                        className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(v)}
                        className="rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary dark:text-white/90 hover:bg-primary/20 dark:hover:bg-primary/30"
                      >
                        {v.isActive ? "Nonaktif" : "Aktif"}
                      </button>
                      <button
                        onClick={() => softDelete(v)}
                        className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-dark-5 dark:text-white/60">
                    Tidak ada data
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        )}

        {pagination ? (
        <Pagination
          className="mt-4"
          page={page}
          pageSize={pageSize}
          total={pagination.total}
          disabled={loading}
          onPageChange={(p: number) => {
            setPage(p);
            load({ page: p });
          }}
        />
      ) : null}
      </div>

      <Modal
        open={editOpen}
        title={editing ? `Edit Varian • ${editing.sku}` : "Edit Varian"}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2 text-xs text-dark-5 dark:text-white/60">
            Produk: <span className="text-white">{editing?.product?.name || "-"}</span>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <input
              className="flex-1 rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
              value={eSku}
              onChange={(e) => setESku(e.target.value)}
              placeholder="SKU unik"
            />
            <button
              type="button"
              onClick={() => {
                const p = editing ? productMap.get(editing.productId) : null;
                setESku(autoSKU(p, eSize, eColor));
              }}
              className="rounded-xl bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90"
            >
              Auto
            </button>
          </div>
          <select
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={eSize}
            onChange={(e) => setESize(e.target.value)}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={eColor}
            onChange={(e) => setEColor(e.target.value)}
            placeholder="Warna (opsional)"
          />
          <CurrencyInput
            prefix
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none text-dark dark:text-white"
            value={ePrice}
            onValueChange={setEPrice}
            placeholder="Harga jual"
          />
          <NumberInput
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={Number(eMinQty || 0)}
            min={0}
            placeholder="Min qty"
            onValueChange={(v) => setEMinQty(String(v))}
          />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-dark-5 dark:text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4 accent-white"
              checked={eIsActive}
              onChange={(e) => setEIsActive(e.target.checked)}
            />
            Varian aktif
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
            disabled={!eSku || !eSize || Number(ePrice) <= 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 disabled:opacity-100 disabled:hover:bg-gray-2 dark:disabled:bg-black/40 dark:disabled:text-dark-6"
          >
            Simpan
          </button>
        </div>
      </Modal>
    </div>
  );
}
