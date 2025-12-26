import { prisma } from "@/lib/prisma";
import type { AccessTokenPayload } from "@/lib/auth";

export type AuditInput = {
  action: string;
  // Optional: used by UI column "Model"; if omitted we'll fallback to entity.
  model?: string;
  entity?: string;
  entityId?: string;
  metadata?: unknown;
};

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? null;
}

export async function writeAuditLog(req: Request, user: AccessTokenPayload | null, input: AuditInput) {
  try {
    const url = new URL(req.url);
    await prisma.auditLog.create({
      data: {
        userId: user?.sub ?? null,
        username: user?.username ?? null,
        role: (user?.role as any) ?? null,
        action: input.action,
        model: input.model ?? input.entity ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        method: req.method,
        path: url.pathname,
        ip: getIp(req),
        userAgent: req.headers.get("user-agent"),
        metadata: (input.metadata as any) ?? undefined,
      },
    });
  } catch {
    // Best-effort only: audit log must not break business flows.
  }
}
