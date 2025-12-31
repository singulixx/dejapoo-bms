"use client";

import React from "react";

type Props = {
  page: number;
  pageSize: number;
  total: number;

  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  disabled?: boolean;
  className?: string;

  pageSizeOptions?: number[];
  compact?: boolean;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled,
  className,
  pageSizeOptions = [10, 20, 50, 100],
  compact,
}: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className={"flex flex-wrap items-center justify-between gap-2 " + (className || "")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => onPageChange(1)}
          disabled={disabled || !canPrev}
          aria-label="First page"
        >
          First
        </button>

        <button
          type="button"
          className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || !canPrev}
        >
          Prev
        </button>

        <div className="select-none rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs text-dark-5 dark:text-white/70">
          Page <span className="font-medium text-dark dark:text-white">{safePage}</span> / {totalPages}
          {!compact ? (
            <span className="ml-2 text-dark-6 dark:text-white/50">
              • Total <span className="font-medium text-dark dark:text-white">{total || 0}</span>
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || !canNext}
        >
          Next
        </button>

        <button
          type="button"
          className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || !canNext}
          aria-label="Last page"
        >
          Last
        </button>
      </div>

      {onPageSizeChange ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-6 dark:text-white/50">Rows</span>
          <select
            className="rounded-xl border border-stroke bg-transparent px-3 py-1.5 text-xs text-dark dark:border-white/10 dark:text-white"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            disabled={disabled}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
