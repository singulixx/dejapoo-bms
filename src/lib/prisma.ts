import { PrismaClient } from "@prisma/client";
import { requestContext } from "@/lib/request-context";

// Base client (tanpa extension) untuk menulis AuditLog tanpa recursion
const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: ExtendedPrismaClient;
};

const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// ✅ Ambil tipe dari hasil $extends biar tidak jadi union
type ExtendedPrismaClient = ReturnType<typeof prismaBase.$extends>;

const createExtendedClient = (): ExtendedPrismaClient => {
  return prismaBase.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Jangan audit table audit itu sendiri
          if (model === "AuditLog") return query(args);

          const shouldAudit =
            operation === "create" ||
            operation === "update" ||
            operation === "delete" ||
            operation === "upsert";

          if (!shouldAudit) return query(args);

          const ctx = requestContext.getStore();
          const result = await query(args);

          // Kalau tidak ada user context, skip audit
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
            // Jangan bikin operasi utama gagal kalau audit gagal
          }

          return result;
        },
      },
    },
  });
};

// ✅ Export prisma dengan 1 tipe yang konsisten
export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
  globalForPrisma.prisma = prisma;
}
