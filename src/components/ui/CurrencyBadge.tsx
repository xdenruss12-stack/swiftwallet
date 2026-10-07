import React from 'react';
import type { CurrencyCode } from '@/lib/currency';

interface CurrencyBadgeProps {
  currency: CurrencyCode;
}

const CURRENCY_STYLE: Record<CurrencyCode, string> = {
  PHP: 'bg-php/15 text-php border border-php/30',
  KRW: 'bg-krw/15 text-krw border border-krw/30',
  USDT: 'bg-usdt/15 text-usdt border border-usdt/30',
};

export default function CurrencyBadge({ currency }: CurrencyBadgeProps) {
  return (
    <span className={`currency-tag ${CURRENCY_STYLE[currency]}`}>{currency}</span>
  );
}