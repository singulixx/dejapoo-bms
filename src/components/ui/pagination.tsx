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
 * Simple pagination UI: ← [page] →
 *
 * We keep `pageSize` and `total` to compute totalPages for enabling/disabling arrows,
 * but we intentionally do not render extra text (no "of", no totals, no pageSize selector).
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
        className="rounded-lg border border-stroke dark:border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
        onClick={() => {
          if (!disabled && canPrev) onPageChange(safePage - 1);
        }}
        disabled={Boolean(disabled) || !canPrev}
      >
        ←
      </button>

      <div className="min-w-[2.5rem] text-center text-sm text-dark dark:text-white">{safePage}</div>

      <button
        type="button"
        aria-label="Next page"
        className="rounded-lg border border-stroke dark:border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
        onClick={() => {
          if (!disabled && canNext) onPageChange(safePage + 1);
        }}
        disabled={Boolean(disabled) || !canNext}
      >
        →
      </button>
    </div>
  );
}

export default Pagination;
