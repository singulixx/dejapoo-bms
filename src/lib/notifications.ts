import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/realtime/pusher-server";

export type NotifyInput = {
  userId?: string | null;
  role?: string | null;
  /** Broadcast to multiple roles (e.g. ["OWNER","ADMIN"]). If provided, `role` is ignored. */
  roles?: string[] | null;
  type?: string;
  title: string;
  message?: string | null;
  href?: string | null;
  metaJson?: any;
};

export async function createAndEmitNotification(input: NotifyInput) {
  const roles = (input.roles ?? null)?.filter(Boolean) ?? null;
  const targetRoles = roles && roles.length ? roles : (input.role ? [input.role] : []);

  // If multiple role targets, create one record per role so role-based inbox filtering works.
  const created = targetRoles.length
    ? await prisma.$transaction(
        targetRoles.map((r) =>
          prisma.notification.create({
            data: {
              userId: input.userId ?? null,
              role: r,
              type: input.type ?? "INFO",
              title: input.title,
              message: input.message ?? null,
              href: input.href ?? null,
              metaJson: input.metaJson ?? null,
            },
          })
        )
      )
    : [
        await prisma.notification.create({
          data: {
            userId: input.userId ?? null,
            role: null,
            type: input.type ?? "INFO",
            title: input.title,
            message: input.message ?? null,
            href: input.href ?? null,
            metaJson: input.metaJson ?? null,
          },
        }),
      ];

  // Emit realtime event (best-effort).
  try {
    if (pusherServer) {
      for (const notif of created) {
        if (notif.userId) {
          await pusherServer.trigger(`private-user-${notif.userId}`, "notification:new", notif);
        }
        if (notif.role) {
          await pusherServer.trigger(`private-role-${notif.role}`, "notification:new", notif);
        }
      }
    }
  } catch {
    // don't block the main operation
  }

  // For convenience, return the first created record.
  return created[0];
}
