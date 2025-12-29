"use client";

import { cn } from "@/lib/utils";

function stringToHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function LetterAvatar({
  username,
  size = 48,
  className,
}: {
  username: string;
  size?: number;
  className?: string;
}) {
  const letter = (username?.trim()?.[0] || "U").toUpperCase();
  const hue = stringToHue(username || "user");

  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 60% 50%)`,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {letter}
    </div>
  );
}
