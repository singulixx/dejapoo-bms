"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseRupiah } from "@/lib/rupiah";

type Props = {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  prefix?: boolean; // show "Rp " inside input
};

function formatPlain(n: number) {
  const v = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  return v.toLocaleString("id-ID");
}

export default function CurrencyInput({
  value,
  onValueChange,
  placeholder,
  className,
  disabled,
  prefix = false,
}: Props) {
  const displayValue = useMemo(() => {
    // UX: jangan paksa tampil "0" saat input masih kosong,
    // supaya placeholder tetap terlihat (terutama untuk field harga).
    if ((value === 0 || !Number.isFinite(value)) && placeholder) return "";
    const plain = formatPlain(value);
    return prefix ? `Rp ${plain}` : plain;
  }, [value, prefix, placeholder]);

  const [text, setText] = useState<string>(displayValue);

  useEffect(() => {
    // keep in sync when value changes from outside
    setText(displayValue);
  }, [displayValue]);

  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      className={(className ? className + " " : "") +
        "placeholder:text-dark-6 dark:placeholder:text-white/40"}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        // jika user menghapus isi input, biarkan kosong agar placeholder muncul.
        if (raw.trim() === "" || raw.trim() === "Rp") {
          onValueChange(0);
          setText("");
          return;
        }

        const n = parseRupiah(raw);
        onValueChange(n);
        setText(prefix ? `Rp ${formatPlain(n)}` : formatPlain(n));
      }}
      onBlur={() => {
        const n = parseRupiah(text);
        onValueChange(n);
        // kalau hasilnya 0 dan ada placeholder, tampilkan kosong agar placeholder muncul
        if (n === 0 && placeholder) {
          setText("");
        } else {
          setText(prefix ? `Rp ${formatPlain(n)}` : formatPlain(n));
        }
      }}
    />
  );
}
