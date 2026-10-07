import React from 'react';
import type { BankInfo } from '@/lib/banks';

interface BankLogoProps {
  bank: BankInfo;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { outer: 'w-8 h-8', text: 'text-[9px]' },
  md: { outer: 'w-10 h-10', text: 'text-xs' },
  lg: { outer: 'w-12 h-12', text: 'text-sm' },
};

export default function BankLogo({ bank, size = 'md' }: BankLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div
      className={`${s.outer} rounded-xl flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: bank.color, color: bank.textColor }}
    >
      <span className={s.text}>{bank.initial}</span>
    </div>
  );
}