'use client';
import React, { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  value: string[];
  onChange: (val: string[]) => void;
  disabled?: boolean;
}

export default function OtpInput({ value, onChange, disabled = false }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(i: number, char: string) {
    const sanitized = char.replace(/\D/g, '').slice(0, 1);
    const next = [...value];
    next[i] = sanitized;
    onChange(next);
    if (sanitized && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
      const next = [...value];
      next[i - 1] = '';
      onChange(next);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {value.map((digit, i) => (
        <input
          key={`otp-${i}`}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`otp-input ${digit ? 'filled' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}