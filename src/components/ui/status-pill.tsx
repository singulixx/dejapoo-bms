"use client";

import clsx from "clsx";

export function StatusPill({
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Nonaktif",
  className,
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium",
        active
          ? "bg-primary text-white"
          : "bg-black/10 text-dark-5 dark:bg-white/10 dark:text-white/70",
        className
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
