"use client";

import Pusher from "pusher-js";
import { getAccessToken } from "@/lib/client";

let singleton: Pusher | null = null;

export function getPusherClient() {
  if (singleton) return singleton;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  singleton = new Pusher(key, {
    cluster,
    // private channels need auth
    authEndpoint: "/api/realtime/auth",
    auth: {
      headers: {
        Authorization: (() => {
          const t = getAccessToken();
          return t ? `Bearer ${t}` : "";
        })(),
      },
    },
  });

  return singleton;
}
