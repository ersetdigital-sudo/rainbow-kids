"use client";

import { useLayoutEffect, useReducer, useRef } from "react";

type BaseInputProps = {
  placeholder?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
};

function digitsOnly(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c >= "0" && c <= "9") out += c;
  }
  return out;
}

function countDigits(value: string, end: number): number {
  let count = 0;
  for (let i = 0; i < end; i++) {
    const c = value[i];
    if (c >= "0" && c <= "9") count += 1;
  }
  return count;
}

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatValue(value: number, zeroAsEmpty: boolean): string {
  const n = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  if (n === 0 && zeroAsEmpty) return "";
  return groupDigits(String(n));
}

function caretAfterDigits(text: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c >= "0" && c <= "9") {
      seen += 1;
      if (seen >= digitCount) return i + 1;
    }
  }
  return text.length;
}

function useFormattedNumber({
  value,
  onValue,
  allowEmpty,
  zeroAsEmpty,
}: {
  value: number | "";
  onValue: (value: number | "") => void;
  allowEmpty: boolean;
  zeroAsEmpty: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const empty = value === "";
  const text = empty ? "" : formatValue(value, zeroAsEmpty);

  // Dijalankan tiap render agar pemisah ribuan & posisi kursor selalu sinkron,
  // termasuk saat user menghapus titik pemisah (nilai angka tidak berubah).
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    if (input.value !== text) input.value = text;
    if (caretDigits.current !== null) {
      const pos = caretAfterDigits(text, caretDigits.current);
      caretDigits.current = null;
      input.setSelectionRange(pos, pos);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const before = countDigits(raw, caret);
    const trimmed = digitsOnly(raw).replace(/^0+(?=\d)/, "");

    caretDigits.current = before;
    if (trimmed === "") onValue(allowEmpty ? "" : 0);
    else onValue(Number(trimmed));
    bump();
  };

  return { ref, text, handleChange };
}

export type MoneyInputProps = BaseInputProps & {
  value: number;
  onChange: (value: number) => void;
};

/** Input nominal rupiah: prefix Rp, pemisah ribuan, nilai tetap number murni. */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  ...rest
}: MoneyInputProps) {
  const { ref, text, handleChange } = useFormattedNumber({
    value,
    onValue: (v) => onChange(v === "" ? 0 : v),
    allowEmpty: false,
    zeroAsEmpty: true,
  });

  return (
    <div className="money-input">
      <span className="money-prefix" aria-hidden="true">
        Rp
      </span>
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={className}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}

type NumberInputBaseProps = BaseInputProps & {
  /** Tampilkan 0 sebagai "0". Default true: 0 tampil kosong. */
  zeroAsEmpty?: boolean;
};

type NumberInputValueProps = NumberInputBaseProps & {
  value: number;
  onChange: (value: number) => void;
  allowEmpty?: false;
};

type NumberInputEmptyProps = NumberInputBaseProps & {
  value: number | "";
  onChange: (value: number | "") => void;
  allowEmpty: true;
};

/** Input jumlah/qty: pemisah ribuan tanpa Rp, nilai tetap number murni. */
export function NumberInput(props: NumberInputValueProps): React.ReactElement;
export function NumberInput(props: NumberInputEmptyProps): React.ReactElement;
export function NumberInput({
  value,
  onChange,
  placeholder = "0",
  zeroAsEmpty = true,
  className,
  allowEmpty,
  ...rest
}: NumberInputValueProps | NumberInputEmptyProps) {
  const { ref, text, handleChange } = useFormattedNumber({
    value,
    onValue: (v) => {
      if (allowEmpty) (onChange as (value: number | "") => void)(v);
      else (onChange as (value: number) => void)(v === "" ? 0 : v);
    },
    allowEmpty: Boolean(allowEmpty),
    zeroAsEmpty,
  });

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}
