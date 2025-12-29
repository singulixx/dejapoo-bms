"use client";

import Pusher from "pusher-js";
import { getAccessToken } from "@/lib/client";

let singleton: Pusher | null = null;
let lastToken: string | null = null;

export function getPusherClient() {
  const currentToken = getAccessToken();
  // Recreate client if token changed (e.g. after login).
  if (singleton && lastToken === currentToken) return singleton;
  if (singleton) {
    try {
      singleton.disconnect();
    } catch {}
    singleton = null;
  }
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  singleton = new Pusher(key, {
    cluster,
    // private channels need auth
    authEndpoint: "/api/realtime/auth",
    auth: {
      headers: {
        Authorization: currentToken ? `Bearer ${currentToken}` : "",
      },
    },
  });

  lastToken = currentToken;

  return singleton;
}
