"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/client";

export function AuthGate() {
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const token = getAccessToken();
    if (!token) {
      // Keep the sign-in URL clean (no `?next=`). After a successful login,
      // the app can redirect to its default landing page.
      router.replace(`/auth/sign-in`);
      return;
    }

    // validate token quickly
    apiFetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) {
          window.localStorage.removeItem("accessToken");
          router.replace(`/auth/sign-in`);
        }
      })
      .catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
