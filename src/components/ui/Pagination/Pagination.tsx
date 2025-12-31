"use client";

import React from "react";

export type PaginationProps = {
  page: number;          // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Icon-only pagination:  ‹  page/totalPages  ›
 * Keeps API-compatible props (page, pageSize, total) so pages don't need changing.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled,
  className,
}: PaginationProps) {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const safeTotal = Math.max(0, Number(total) || 0);
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), pageCount);

  const canPrev = safePage > 1;
  const canNext = safePage < pageCount;

  return (
    <div className={"flex items-center justify-end gap-3" + (className ? ` ${className}` : "")}>
      <button
        type="button"
        aria-label="Previous page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stroke bg-white text-dark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        onClick={() => {
          if (!disabled && canPrev) onPageChange(safePage - 1);
        }}
        disabled={Boolean(disabled) || !canPrev}
      >
        {/* Chevron Left */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="min-w-[56px] select-none text-center text-sm text-dark-5 dark:text-white/70">
        {safePage}/{pageCount}
      </div>

      <button
        type="button"
        aria-label="Next page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stroke bg-white text-dark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
        onClick={() => {
          if (!disabled && canNext) onPageChange(safePage + 1);
        }}
        disabled={Boolean(disabled) || !canNext}
      >
        {/* Chevron Right */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

export default Pagination;
