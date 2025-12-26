"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellIcon } from "./icons";
import { apiFetch } from "@/lib/client";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import { formatMessageTime } from "@/lib/format-message-time";
import { useNotify } from "@/components/ui/notify";

type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  href?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useIsMobile();
  const notify = useNotify();

  const isDotVisible = unreadCount > 0;

  const newLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return `${unreadCount} new`;
  }, [unreadCount]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/notifications?limit=20")
      .then(async (r) => {
        if (!r.ok) return;
        const data = (await r.json()) as { items: NotificationItem[]; unreadCount: number };
        if (cancelled) return;
        setItems(data.items ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscribe (role-based + user-based)
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    let userId: string | null = null;
    let role: string | null = null;

    const bind = async () => {
      // get user payload once
      const me = await apiFetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      userId = me?.user?.sub ?? null;
      role = me?.user?.role ?? null;

      const chs: string[] = [];
      if (userId) chs.push(`private-user-${userId}`);
      if (role) chs.push(`private-role-${role}`);

      const handler = (notif: NotificationItem) => {
        setItems((prev) => [notif, ...prev].slice(0, 20));
        setUnreadCount((c) => c + 1);
        // Toast kecil (biar terasa realtime)
        notify.toast({
          title: notif.title,
          description: notif.message ?? undefined,
          variant: "info",
        });
      };

      for (const chName of chs) {
        const ch = pusher.subscribe(chName);
        ch.bind("notification:new", handler);
      }

      return () => {
        for (const chName of chs) {
          const ch = pusher.channel(chName);
          if (ch) ch.unbind("notification:new", handler);
          pusher.unsubscribe(chName);
        }
      };
    };

    let cleanup: (() => void) | null = null;
    bind()
      .then((c) => {
        cleanup = c ?? null;
      })
      .catch(() => void 0);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);

        // Mark read when the dropdown is opened
        if (open && unreadCount > 0) {
          apiFetch("/api/notifications/read", {
            method: "POST",
            body: JSON.stringify({ all: true }),
          })
            .then(async (r) => {
              if (!r.ok) return;
              const data = (await r.json()) as { unreadCount?: number };
              setUnreadCount(data.unreadCount ?? 0);
              setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
            })
            .catch(() => void 0);
        }
      }}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {isDotVisible && (
            <span
              className={cn(
                "absolute right-0 top-0 z-1 size-2 rounded-full bg-red-light ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
              <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-light opacity-75" />
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-card px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[20rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Notifications
          </span>
          {newLabel && (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {newLabel}
            </span>
          )}
        </div>

        <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-dark-5 dark:text-dark-6">
              Belum ada notifikasi.
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id} role="menuitem">
                <Link
                  href={item.href || "#"}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3",
                    !item.isRead && "bg-blue-light-5/50 dark:bg-dark-3",
                  )}
                >
                  <Image
                    src="/images/user/user-03.png"
                    className="size-14 rounded-full object-cover"
                    width={200}
                    height={200}
                    alt="Notification"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="block truncate text-sm font-medium text-dark dark:text-white">
                        {item.title}
                      </strong>
                      <span className="shrink-0 text-xs font-medium text-dark-5 dark:text-dark-6">
                        {formatMessageTime(item.createdAt)}
                      </span>
                    </div>

                    {item.message && (
                      <span className="block truncate text-sm font-medium text-dark-5 dark:text-dark-6">
                        {item.message}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>

        <Link
          href="#"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
        >
          See all notifications
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}