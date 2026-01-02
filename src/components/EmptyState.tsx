import Image from "next/image";

type EmptyStateProps = {
  title?: string;
  description?: string;
  /** Optional: text for a primary action button */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export default function EmptyState({
  title = "Belum ada data",
  description = "Data akan muncul setelah kamu menambahkan item baru.",
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stroke dark:border-white/20 bg-gray-2/40 dark:bg-black/20 px-6 py-10 text-center " +
        (className || "")
      }
    >
      <div className="relative h-28 w-28">
        <Image
          src="/empty-state.svg"
          alt="Empty state"
          fill
          sizes="112px"
          className="object-contain"
          priority={false}
        />
      </div>
      <div className="mt-1 text-base font-semibold text-dark dark:text-white/90">{title}</div>
      <div className="max-w-[480px] text-sm text-dark-5 dark:text-white/60">{description}</div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
