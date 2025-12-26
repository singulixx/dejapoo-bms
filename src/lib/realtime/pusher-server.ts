import Pusher from "pusher";

/**
 * Server-side Pusher client.
 *
 * Works well on Vercel (serverless) because it does not rely on long-lived
 * websocket connections from the backend.
 */
export const pusherServer =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
    : null;
