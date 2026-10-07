export type PaymentChannel =
  | 'KRW_BANK_TRANSFER' |'PHP_BANK_TRANSFER' |'PHP_GCASH' |'USDT_BINANCE' |'USDT_TRUST_WALLET' |'USDT_METAMASK' |'USDT_COINBASE' |'USDT_OKX' |'USDT_BYBIT' |'TOSS';

interface ChannelConfig {
  label: string;
  enabled: boolean;
  maintenance?: boolean;
  maintenanceNote?: string;
}

// Backend integration point: replace with API call to /api/payment-channels
export const PAYMENT_CHANNEL_CONFIG: Record<PaymentChannel, ChannelConfig> = {
  KRW_BANK_TRANSFER: { label: 'KRW Bank Transfer', enabled: true },
  PHP_BANK_TRANSFER: { label: 'PHP Bank Transfer', enabled: true },
  PHP_GCASH: { label: 'GCash', enabled: true },
  USDT_BINANCE: { label: 'Binance', enabled: true },
  USDT_TRUST_WALLET: { label: 'Trust Wallet', enabled: true },
  USDT_METAMASK: { label: 'MetaMask', enabled: true },
  USDT_COINBASE: { label: 'Coinbase', enabled: false, maintenanceNote: 'Temporarily unavailable' },
  USDT_OKX: { label: 'OKX', enabled: true },
  USDT_BYBIT: { label: 'Bybit', enabled: true },
  TOSS: { label: 'Toss', enabled: true },
};

export function isPaymentChannelEnabled(channel: PaymentChannel): boolean {
  return PAYMENT_CHANNEL_CONFIG[channel]?.enabled ?? false;
}

export function getChannelMaintenanceNote(channel: PaymentChannel): string | undefined {
  return PAYMENT_CHANNEL_CONFIG[channel]?.maintenanceNote;
}