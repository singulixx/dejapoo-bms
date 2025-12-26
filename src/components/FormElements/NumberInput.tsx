"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseRupiah } from "@/lib/rupiah";

type Props = {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
};

function clampInt(n: number, min: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.max(min, v);
}

function formatInt(n: number, min: number) {
  const v = clampInt(n, min);
  return v.toLocaleString("id-ID");
}

export default function NumberInput({
  value,
  onValueChange,
  placeholder,
  className,
  disabled,
  min = 0,
}: Props) {
  const displayValue = useMemo(() => {
    if ((value === 0 || !Number.isFinite(value)) && placeholder) return "";
    return formatInt(value, min);
  }, [value, min, placeholder]);

  const [text, setText] = useState<string>(displayValue);

  useEffect(() => {
    setText(displayValue);
  }, [displayValue]);

  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      className={
        (className ? className + " " : "") +
        "placeholder:text-dark-6 dark:placeholder:text-white/40"
      }
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;

        if (raw.trim() === "") {
          onValueChange(0);
          setText("");
          return;
        }

        const n = parseRupiah(raw);
        const clamped = clampInt(n, min);
        onValueChange(clamped);
        setText(formatInt(clamped, min));
      }}
      onBlur={() => {
        const n = parseRupiah(text);
        const clamped = clampInt(n, min);
        onValueChange(clamped);

        if (clamped === 0 && placeholder) {
          setText("");
        } else {
          setText(formatInt(clamped, min));
        }
      }}
    />
  );
}
