async function getData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/outlets`, { cache: "no-store" }).catch(() => null as any);
  if (!res || !res.ok) return null;
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transfer Stok Antar Outlet</h1>
        <p className="text-sm text-dark-5 dark:text-white/60">Endpoint: POST /api/stock/transfer. Atomic + validasi stok.</p>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-stroke dark:border-white/20 bg-card dark:bg-card/[0.03] p-6 text-sm text-dark-5 dark:text-white/70">
          API belum tersambung.
        </div>
      ) : (
        <pre className="overflow-auto rounded-2xl border border-stroke dark:border-white/20 bg-gray-2 dark:bg-black/40 p-4 text-xs text-dark dark:text-white">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
