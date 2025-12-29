import { cn } from "@/lib/utils";

type LetterAvatarProps = {
  /** Usually the username */
  name?: string | null;
  /** Tailwind size classes can be provided via className; default is 48px (size-12) */
  className?: string;
  /** Fallback letter when name is empty */
  fallbackLetter?: string;
  /** Use 1 letter by default; set to 2 for initials */
  letters?: 1 | 2;
};

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    // eslint-disable-next-line no-bitwise
    hash &= hash;
  }
  return Math.abs(hash);
}

function colorFromName(name: string) {
  const h = hashString(name) % 360;
  return `hsl(${h} 65% 45%)`;
}

function getInitials(name: string, letters: 1 | 2) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  if (letters === 1) return trimmed[0]!.toUpperCase();

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function LetterAvatar({
  name,
  className,
  fallbackLetter = "U",
  letters = 1,
}: LetterAvatarProps) {
  const safeName = name || "";
  const initials = getInitials(safeName, letters) || fallbackLetter.toUpperCase();
  const bg = colorFromName(safeName || fallbackLetter);

  return (
    <div
      role="img"
      aria-label={safeName ? `Avatar of ${safeName}` : "Avatar"}
      className={cn(
        "size-12 shrink-0 rounded-full flex items-center justify-center text-white font-semibold select-none",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      <span className="text-xl leading-none">{initials}</span>
    </div>
  );
}
