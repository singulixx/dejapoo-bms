"use client";

import React from "react";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Simple pagination UI: <  page/totalPages  >
 *
 * We keep `pageSize` and `total` to compute totalPages for enabling/disabling arrows.
 * The UI is intentionally minimal: just two icon buttons and the `page/totalPages` indicator.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1)));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className={("flex items-center justify-end gap-2 " + (className || "")).trim()}>
      <button
        type="button"
        aria-label="Previous page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-white text-dark hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        onClick={() => {
          if (!disabled && canPrev) onPageChange(safePage - 1);
        }}
        disabled={Boolean(disabled) || !canPrev}
      >
        <span aria-hidden className="text-lg leading-none">
          ‹
        </span>
      </button>

      <div className="min-w-[3.25rem] select-none text-center text-sm text-dark-5 dark:text-white/70">
        {safePage}/{totalPages}
      </div>

      <button
        type="button"
        aria-label="Next page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-white text-dark hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        onClick={() => {
          if (!disabled && canNext) onPageChange(safePage + 1);
        }}
        disabled={Boolean(disabled) || !canNext}
      >
        <span aria-hidden className="text-lg leading-none">
          ›
        </span>
      </button>
    </div>
  );
}

export default Pagination;
