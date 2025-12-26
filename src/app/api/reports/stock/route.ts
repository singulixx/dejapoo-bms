import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json"; // json | csv | xlsx
  const lowOnly = url.searchParams.get("lowOnly") === "1";

  const rows = await prisma.stock.findMany({
    include: { outlet: true, variant: { include: { product: true } } },
    orderBy: [{ outletId: "asc" }],
  });

  const data = rows
    .map((r) => ({
      outlet: r.outlet.name,
      outletType: r.outlet.type,
      product: r.variant.product.name,
      sku: r.variant.sku,
      size: r.variant.size,
      color: r.variant.color ?? "",
      qty: r.qty,
      minQty: r.variant.minQty,
    }))
    .filter((r) => (lowOnly ? r.qty < r.minQty : true));

  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Stock");
    ws.addRow(["Outlet","Product","Variant","SKU","Size","Color","Qty","MinQty"]); 
    for (const r of rows) {
      ws.addRow([r.outletName, r.productName, r.variantName, r.sku, r.size, r.color || "", r.qty, r.minQty]);
    }
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="stock-report.xlsx"`,
      },
    });
  }

  if (format === "csv") {
    const header = ["outlet","outletType","product","sku","size","color","qty","minQty"];
    const lines = [header.join(","), ...data.map(d => header.map(k => JSON.stringify((d as any)[k] ?? "")).join(","))];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=stock_report.csv",
      },
    });
  }

  return NextResponse.json({ items: data });
}
