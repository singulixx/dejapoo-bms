"use client";

import React from "react";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export function Pagination({ page, totalPages, onPageChange, disabled, className }: Props) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={`flex items-center justify-end gap-2 ${className ?? ""}`}>
      <button
        type="button"
        className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={disabled || !canPrev}
      >
        Prev
      </button>

      <div className="min-w-[96px] select-none rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-center text-xs text-dark-5 dark:text-white/70">
        Page {page} / {Math.max(1, totalPages)}
      </div>

      <button
        type="button"
        className="rounded-xl border border-stroke dark:border-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={disabled || !canNext}
      >
        Next
      </button>
    </div>
  );
}
