"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = Required<ToastInput> & { id: string };

type ConfirmInput = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type NotifyContextValue = {
  toast: (t: ToastInput) => void;
  confirm: (c: ConfirmInput) => Promise<boolean>;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [confirmState, setConfirmState] = useState<
    (ConfirmInput & { open: boolean }) | null
  >(null);
  const confirmResolverRef = useRef<((v: boolean) => void) | null>(null);

  const toast = useCallback((input: ToastInput) => {
    const item: ToastItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: input.title,
      description: input.description ?? "",
      variant: input.variant ?? "info",
      durationMs: input.durationMs ?? 2800,
    };
    setToasts((prev) => [item, ...prev].slice(0, 5));

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }, item.durationMs);
  }, []);

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        title: input.title,
        description: input.description ?? "",
        confirmText: input.confirmText ?? "Ya",
        cancelText: input.cancelText ?? "Batal",
        destructive: !!input.destructive,
        open: true,
      });
    });
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  const closeConfirm = (result: boolean) => {
    setConfirmState(null);
    const r = confirmResolverRef.current;
    confirmResolverRef.current = null;
    r?.(result);
  };

  return (
    <NotifyContext.Provider value={value}>
      {children}

      {/* Toasts */}
      <div className="fixed right-4 top-4 z-[1000] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
              "bg-white/90 text-slate-900 border-slate-200",
              "dark:bg-slate-900/90 dark:text-slate-100 dark:border-slate-800",
              t.variant === "success" &&
                "border-emerald-200 dark:border-emerald-900/60",
              t.variant === "error" && "border-rose-200 dark:border-rose-900/60"
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description ? (
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {t.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState?.open ? (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {confirmState.title}
            </div>
            {confirmState.description ? (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {confirmState.description}
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm text-white",
                  confirmState.destructive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-violet-600 hover:bg-violet-700"
                )}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify must be used within NotifyProvider");
  return ctx;
}
