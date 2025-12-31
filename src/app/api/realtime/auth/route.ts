import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { pusherServer } from "@/lib/realtime/pusher-server";

export const dynamic = 'force-dynamic';

/**
 * Pusher private channel auth.
 *
 * Client (pusher-js) will POST: { socket_id, channel_name }
 */
export async function POST(req: Request) {
  if (!pusherServer) {
    return NextResponse.json({ message: "Pusher not configured" }, { headers: { "Cache-Control": "no-store" }, status: 501 });
  }

  const auth = requireAuth(req);
  if (!auth.ok) return auth.res;

  // pusher-js sends auth payload as x-www-form-urlencoded by default.
  // Support both JSON and form-encoded bodies.
  const ct = req.headers.get("content-type") || "";
  let socketId: string | undefined;
  let channelName: string | undefined;
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | { socket_id?: string; channel_name?: string }
      | null;
    socketId = body?.socket_id;
    channelName = body?.channel_name;
  } else {
    const raw = await req.text().catch(() => "");
    const params = new URLSearchParams(raw);
    socketId = params.get("socket_id") || undefined;
    channelName = params.get("channel_name") || undefined;
  }
  if (!socketId || !channelName) {
    return NextResponse.json({ message: "Invalid payload" }, { headers: { "Cache-Control": "no-store" }, status: 400 });
  }

  // Only allow:
  // - private-user-<userId>
  // - private-role-<role>
  const user = auth.user;
  const userRole = String(user.role ?? "").trim().toUpperCase();
  if (channelName.startsWith("private-user-")) {
    const targetUserId = channelName.replace("private-user-", "");
    if (targetUserId !== user.sub) {
      return NextResponse.json({ message: "Forbidden" }, { headers: { "Cache-Control": "no-store" }, status: 403 });
    }
  } else if (channelName.startsWith("private-role-")) {
    const targetRole = channelName.replace("private-role-", "");
    if (String(targetRole).trim().toUpperCase() !== userRole) {
      return NextResponse.json({ message: "Forbidden" }, { headers: { "Cache-Control": "no-store" }, status: 403 });
    }
  } else {
    return NextResponse.json({ message: "Forbidden" }, { headers: { "Cache-Control": "no-store" }, status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse, { headers: { "Cache-Control": "no-store" } });
}