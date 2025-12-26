import { PrismaClient } from "@prisma/client";
import { requestContext } from "@/lib/request-context";

// Prisma v6: middleware ($use) is removed. Use $extends(query) to implement auditing.

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: PrismaClient;
};

// Base client (no extensions) — used to write AuditLog safely without recursion.
const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Extended client used by the app.
export const prisma =
  globalForPrisma.prisma ??
  prismaBase.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Never audit the audit table itself
          if (model === "AuditLog") return query(args);

          const shouldAudit =
            operation === "create" ||
            operation === "update" ||
            operation === "delete" ||
            operation === "upsert";
          if (!shouldAudit) return query(args);

          const ctx = requestContext.getStore();
          const result = await query(args);

          // If we don't know who performed the action, don't write an audit row.
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
            // Do not block main operation if audit logging fails
          }

          return result;
        },
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
  globalForPrisma.prisma = prisma;
}
