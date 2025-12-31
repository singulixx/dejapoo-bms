"use client";

import React from "react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export function Pagination({ page, pageSize, total, onPageChange, disabled, className }: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1)));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className={"flex items-center justify-end gap-2 " + (className || "")}>
      <button
        type="button"
        aria-label="Previous page"
        className="rounded-lg border border-stroke dark:border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
        onClick={() => canPrev && onPageChange(safePage - 1)}
        disabled={disabled || !canPrev}
      >
        ←
      </button>

      <div className="min-w-[2.5rem] text-center text-sm text-dark dark:text-white">
        {safePage}
      </div>

      <button
        type="button"
        aria-label="Next page"
        className="rounded-lg border border-stroke dark:border-white/10 px-3 py-1.5 text-sm disabled:opacity-50"
        onClick={() => canNext && onPageChange(safePage + 1)}
        disabled={disabled || !canNext}
      >
        →
      </button>
    </div>
  );
}

export default Pagination;
