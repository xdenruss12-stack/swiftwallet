export type CurrencyCode = 'PHP' | 'KRW' | 'USDT';

export function getCurrencySymbol(code: CurrencyCode): string {
  switch (code) {
    case 'PHP': return '₱';
    case 'KRW': return '₩';
    case 'USDT': return '$';
  }
}

export function getCurrencyName(code: CurrencyCode): string {
  switch (code) {
    case 'PHP': return 'Philippine Peso';
    case 'KRW': return 'Korean Won';
    case 'USDT': return 'Tether USD';
  }
}

export function fmtCurrency(amount: number, code: CurrencyCode): string {
  const symbol = getCurrencySymbol(code);
  if (code === 'KRW') {
    return `${symbol}${amount.toLocaleString('ko-KR')}`;
  }
  if (code === 'USDT') {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // PHP
  return `${symbol}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtCompact(amount: number, code: CurrencyCode): string {
  const symbol = getCurrencySymbol(code);
  if (code === 'KRW') {
    if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
    return `${symbol}${amount.toLocaleString('ko-KR')}`;
  }
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(2)}K`;
  return fmtCurrency(amount, code);
}

export const EXCHANGE_RATES: Record<string, number> = {
  'PHP_KRW': 19.74,
  'KRW_PHP': 0.0507,
  'PHP_USDT': 0.0175,
  'USDT_PHP': 57.14,
  'KRW_USDT': 0.000747,
  'USDT_KRW': 1338.5,
};