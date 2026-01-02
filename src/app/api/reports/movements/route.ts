import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// ExcelJS needs Node.js runtime (not Edge)
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") || undefined;
  const format = url.searchParams.get("format") || "json"; // json | csv | xlsx

  const where: any = {};
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to) where.createdAt.lte = new Date(to);
  if (type) where.type = type;

  // Export mode (CSV/XLSX): return all rows in range (capped)
  if (format === "csv" || format === "xlsx") {
    const rows = await prisma.stockMovement.findMany({
      where,
      include: { outlet: true, variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const data = rows.map((m) => ({
      createdAt: m.createdAt.toISOString(),
      type: m.type,
      outlet: m.outlet.name,
      product: m.variant.product.name,
      sku: m.variant.sku,
      size: m.variant.size,
      color: m.variant.color ?? "",
      qty: m.qty,
      refType: m.refType ?? "",
      refId: m.refId ?? "",
      note: m.note ?? "",
    }));

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Movements");
      ws.addRow(["Tanggal", "Tipe", "Outlet", "Produk", "SKU", "Size", "Warna", "Qty", "RefType", "RefId", "Note"]);
      for (const r of data) {
        ws.addRow([r.createdAt, r.type, r.outlet, r.product, r.sku, r.size, r.color, r.qty, r.refType, r.refId, r.note]);
      }
      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(Buffer.from(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="stock-movements.xlsx"`,
        },
      });
    }

    const header = ["createdAt", "type", "outlet", "product", "sku", "size", "color", "qty", "refType", "refId", "note"];
    const lines = [header.join(","), ...data.map((d) => header.map((k) => JSON.stringify((d as any)[k] ?? "")).join(","))];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=stock_movements.csv",
      },
    });
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10)));

  const [total, items] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: { outlet: true, variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      type: m.type,
      outlet: m.outlet.name,
      sku: m.variant.sku,
      product: m.variant.product.name,
      qty: m.qty,
      note: m.note ?? "",
      refType: m.refType ?? "",
      refId: m.refId ?? "",
      createdAt: m.createdAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
