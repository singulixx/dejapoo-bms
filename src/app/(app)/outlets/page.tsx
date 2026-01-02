"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client";
import EmptyState from "@/components/EmptyState";
import { useNotify } from "@/components/ui/notify";
import { StatusPill } from "@/components/ui/status-pill";

type Outlet = {
  id: string;
  name: string;
  type: "WAREHOUSE" | "OFFLINE_STORE" | "ONLINE";
  isActive: boolean;
};

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

export default function OutletsPage() {
  const { toast, confirm } = useNotify();
  const [items, setItems] = useState<Outlet[]>([]);
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<Outlet["type"]>("WAREHOUSE");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [eName, setEName] = useState("");
  const [eType, setEType] = useState<Outlet["type"]>("WAREHOUSE");
  const [eIsActive, setEIsActive] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);

    const res = await apiFetch(
      `/api/outlets?includeInactive=${includeInactive ? 1 : 0}`,
    );
    if (!res.ok) {
      setErr("Gagal memuat outlet");
      setLoading(false);
      return;
    }
    const j = await res.json();
    const rows: Outlet[] = j.items || [];

    const qq = q.trim().toLowerCase();
    setItems(
      !qq
        ? rows
        : rows.filter(
            (o) =>
              o.name.toLowerCase().includes(qq) ||
              o.type.toLowerCase().includes(qq),
          ),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((x) => x.isActive).length;
    return { total, active };
  }, [items]);

  async function createOutlet() {
    setErr(null);
    const payload = { name: name.trim(), type };
    if (!payload.name) {
      setErr("Nama outlet wajib diisi");
      return;
    }
    const res = await apiFetch("/api/outlets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setErr("Gagal membuat outlet");
      return;
    }
    setName("");
    setType("WAREHOUSE");
    await load();
  }

  function openEdit(o: Outlet) {
    setEditing(o);
    setEName(o.name);
    setEType(o.type);
    setEIsActive(o.isActive);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    setErr(null);
    const res = await apiFetch(`/api/outlets/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: eName.trim(),
        type: eType,
        isActive: eIsActive,
      }),
    });
    if (!res.ok) {
      setErr("Gagal menyimpan perubahan");
      return;
    }
    setEditOpen(false);
    setEditing(null);
    await load();
  }

  async function toggleActive(o: Outlet) {
    setErr(null);
    const res = await apiFetch(`/api/outlets/${o.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !o.isActive }),
    });
    if (!res.ok) {
      setErr("Gagal mengubah status");
      return;
    }
    await load();
  }

  async function softDelete(o: Outlet) {
    const ok = await confirm({
      title: "Hapus outlet?",
      description: `Outlet "${o.name}" akan dihapus (soft delete).`,
      confirmText: "Hapus",
      cancelText: "Batal",
      destructive: true,
    });
    if (!ok) return;
    setErr(null);
    const res = await apiFetch(`/api/outlets/${o.id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr("Gagal menghapus outlet");
      toast({ title: "Gagal", description: "Gagal menghapus outlet", variant: "error" });
      return;
    }
    await load();
    toast({ title: "Terhapus", description: "Outlet berhasil dihapus", variant: "success" });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Outlet</h1>
          <div className="text-sm text-dark-5 dark:text-white/60">
            Gudang & toko (bisa tambah banyak)
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <input
            className="rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari outlet..."
          />
          <label className="inline-flex items-center gap-2 rounded-xl bg-primary bg-black/20 px-3 py-2 text-sm text-white">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Tampilkan nonaktif
          </label>
          <button
            onClick={load}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4">
          <div className="mb-3 text-sm font-semibold">Tambah Outlet</div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs text-dark-5 dark:text-white/60">
                Nama
              </div>
              <input
                className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Gudang Pusat"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-dark-5 dark:text-white/60">
                Tipe
              </div>
              <select
                className="w-full rounded-xl bg-gray-2 dark:bg-black/40 border border-stroke dark:border-white/20 px-3 py-2 outline-none"
                value={type}
                onChange={(e) => setType(e.target.value as Outlet["type"])}
              >
                <option value="WAREHOUSE">WAREHOUSE (Gudang)</option>
                <option value="OFFLINE_STORE">OFFLINE_STORE (Toko)</option>
                <option value="ONLINE">ONLINE (Opsional)</option>
              </select>
            </div>
            <button
              onClick={createOutlet}
              className="w-full rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
            >
              Simpan
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/5 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm text-dark-5 dark:text-white/70">
              Total: <span className="text-dark dark:text-white font-semibold">{stats.total}</span> · Aktif:{" "}
              <span className="text-dark dark:text-white font-semibold">{stats.active}</span>
            </div>
            {loading ? (
              <div className="text-sm text-dark-5 dark:text-white/60">
                Loading...
              </div>
            ) : null}
          </div>

          {items.length === 0 && !loading ? (
            <EmptyState
              title="Belum ada outlet"
              description="Tambahkan outlet/gudang agar stok bisa disimpan per lokasi."
              illustration="/empty/empty-outlets.svg"
            />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-dark dark:text-white/90">
              <thead className="text-dark-5 dark:text-white/60">
                <tr>
                  <th className="py-2 text-left">Nama</th>
                  <th className="py-2 text-left">Tipe</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-stroke dark:border-white/20"
                  >
                    <td className="py-2 font-medium text-dark dark:text-white">
                      {o.name}
                    </td>
                    <td className="py-2 text-dark-5 dark:text-white/70">
                      {o.type}
                    </td>
                    <td className="py-2">
                      <Badge active={o.isActive} />
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEdit(o)}
                          className="rounded-xl bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(o)}
                          className="rounded-xl bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                        >
                          {o.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => softDelete(o)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/15"
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
          )}
        </div>
      </div>

      <Modal
        open={editOpen}
        title={`Edit Outlet${editing ? ` — ${editing.name}` : ""}`}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-dark-5 dark:text-white/60">Nama</div>
            <input
              className="w-full rounded-xl bg-black/40 bg-primary px-3 py-2 outline-none"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-dark-5 dark:text-white/60">Tipe</div>
            <select
              className="w-full rounded-xl bg-black/40 bg-primary px-3 py-2 outline-none"
              value={eType}
              onChange={(e) => setEType(e.target.value as Outlet["type"])}
            >
              <option value="WAREHOUSE">WAREHOUSE (Gudang)</option>
              <option value="OFFLINE_STORE">OFFLINE_STORE (Toko)</option>
              <option value="ONLINE">ONLINE (Opsional)</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={eIsActive}
              onChange={(e) => setEIsActive(e.target.checked)}
            />
            Aktif
          </label>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
            >
              Simpan
            </button>
            <button
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              className="rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 px-4 py-2 text-sm text-primary dark:text-white/90 hover:bg-primary/20 dark:hover:bg-primary/30"
            >
              Batal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}