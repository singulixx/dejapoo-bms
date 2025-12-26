export function formatRupiah(
  value: number | null | undefined,
  opts?: { prefix?: boolean }
): string {
  const prefix = opts?.prefix ?? true;
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  const formatted = Math.max(0, n).toLocaleString("id-ID");
  return prefix ? `Rp ${formatted}` : formatted;
}

export function parseRupiah(input: string): number {
  // Keep digits only; "Rp 10.000" -> 10000
  const digits = (input || "").replace(/[^0-9]/g, "");
  if (!digits) return 0;
  // parse as integer rupiah
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}
