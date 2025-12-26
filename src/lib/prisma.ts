import { PrismaClient } from "@prisma/client";
import { requestContext } from "@/lib/request-context";

// Simpan di global saat dev supaya tidak bikin banyak koneksi
const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: PrismaExtendedClient;
};

const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Buat extended client dulu, lalu ambil tipe dari typeof (ini yang bikin tidak "unknown")
const prismaExtended = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: any) {
        // jangan audit audit table itu sendiri
        if (model === "AuditLog") return query(args);

        const shouldAudit =
          operation === "create" ||
          operation === "update" ||
          operation === "delete" ||
          operation === "upsert";

        if (!shouldAudit) return query(args);

        const ctx = requestContext.getStore();
        const result = await query(args);

        // kalau tidak ada user context, skip
        if (!ctx?.user?.id) return result;

        try {
          const entityId =
            (result &&
            typeof result === "object" &&
            "id" in result &&
            typeof (result as any).id === "string"
              ? (result as any).id
              : null) ||
            (args?.where?.id as string | undefined) ||
            null;

          const auditAction = `${model ?? "UNKNOWN"}_${operation}`.toUpperCase();

          await prismaBase.auditLog.create({
            data: {
              userId: ctx.user.id,
              username: ctx.user.username ?? null,
              role: (ctx.user.role as any) ?? null,
              action: auditAction,
              model: model ?? null,
              entity: model ?? null,
              entityId,
              method: ctx.req?.method ?? null,
              path: ctx.req?.path ?? null,
              ip: ctx.req?.ip ?? null,
              userAgent: ctx.req?.userAgent ?? null,
              data: {
                where: args?.where ?? null,
                data: args?.data ?? null,
              } as any,
            },
          });
        } catch {
          // jangan bikin operasi utama gagal kalau audit gagal
        }

        return result;
      },
    },
  },
});

export type PrismaExtendedClient = typeof prismaExtended;

// ✅ export prisma yang typed (bukan unknown)
export const prisma: PrismaExtendedClient =
  globalForPrisma.prisma ?? prismaExtended;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
  globalForPrisma.prisma = prisma;
}
