import type { CurrencyCode } from './currency';

export type TxType = 'deposit' | 'withdrawal' | 'send' | 'receive' | 'buy' | 'topup' | 'fee';
export type TxStatus = 'completed' | 'pending' | 'processing' | 'failed';

export interface Transaction {
  id: string;
  type: TxType;
  currency: CurrencyCode;
  amount: number;
  direction: 'in' | 'out';
  status: TxStatus;
  date: string;
  description: string;
  reference: string;
  channel: string;
  fee?: number;
}

export interface WalletBalance {
  currency: CurrencyCode;
  balance: number;
  pendingIn: number;
  pendingOut: number;
  monthlyIn: number;
  monthlyOut: number;
}

export const WALLET_BALANCES: WalletBalance[] = [
  { currency: 'PHP', balance: 48_250.75, pendingIn: 15_000, pendingOut: 0, monthlyIn: 82_500, monthlyOut: 34_249.25 },
  { currency: 'KRW', balance: 1_287_450, pendingIn: 0, pendingOut: 250_000, monthlyIn: 2_100_000, monthlyOut: 812_550 },
  { currency: 'USDT', balance: 847.32, pendingIn: 0, pendingOut: 0, monthlyIn: 1_250.00, monthlyOut: 402.68 },
];

export const TRANSACTIONS: Transaction[] = [
  { id: 'tx-001', type: 'deposit', currency: 'PHP', amount: 15000, direction: 'in', status: 'pending', date: '10/06/2026', description: 'BDO Bank Deposit', reference: 'DEP-20261006-0182', channel: 'PHP_BANK_TRANSFER', fee: 0 },
  { id: 'tx-002', type: 'deposit', currency: 'KRW', amount: 500000, direction: 'in', status: 'completed', date: '10/05/2026', description: 'KB국민 Bank Transfer', reference: 'DEP-20261005-0177', channel: 'KRW_BANK_TRANSFER', fee: 0 },
  { id: 'tx-003', type: 'withdrawal', currency: 'PHP', amount: 8500, direction: 'out', status: 'completed', date: '10/05/2026', description: 'BPI Withdrawal', reference: 'WIT-20261005-0091', channel: 'PHP_BANK_TRANSFER', fee: 25 },
  { id: 'tx-004', type: 'send', currency: 'USDT', amount: 150, direction: 'out', status: 'completed', date: '10/04/2026', description: 'USDT Send via Binance', reference: 'SND-20261004-0055', channel: 'USDT_BINANCE', fee: 1.5 },
  { id: 'tx-005', type: 'withdrawal', currency: 'KRW', amount: 250000, direction: 'out', status: 'processing', date: '10/04/2026', description: '신한은행 출금', reference: 'WIT-20261004-0088', channel: 'KRW_BANK_TRANSFER', fee: 500 },
  { id: 'tx-006', type: 'topup', currency: 'USDT', amount: 300, direction: 'in', status: 'completed', date: '10/03/2026', description: 'Top Up via Trust Wallet', reference: 'TOP-20261003-0044', channel: 'USDT_TRUST_WALLET', fee: 2 },
  { id: 'tx-007', type: 'deposit', currency: 'PHP', amount: 25000, direction: 'in', status: 'completed', date: '10/02/2026', description: 'GCash Deposit', reference: 'DEP-20261002-0163', channel: 'PHP_GCASH', fee: 0 },
  { id: 'tx-008', type: 'buy', currency: 'USDT', amount: 200, direction: 'in', status: 'completed', date: '10/01/2026', description: 'Buy USDT via OKX', reference: 'BUY-20261001-0033', channel: 'USDT_OKX', fee: 2.5 },
  { id: 'tx-009', type: 'deposit', currency: 'KRW', amount: 800000, direction: 'in', status: 'completed', date: '09/30/2026', description: '우리은행 입금', reference: 'DEP-20260930-0159', channel: 'KRW_BANK_TRANSFER', fee: 0 },
  { id: 'tx-010', type: 'withdrawal', currency: 'PHP', amount: 12000, direction: 'out', status: 'failed', date: '09/29/2026', description: 'Metrobank Withdrawal', reference: 'WIT-20260929-0082', channel: 'PHP_BANK_TRANSFER', fee: 0 },
  { id: 'tx-011', type: 'send', currency: 'USDT', amount: 75.5, direction: 'out', status: 'completed', date: '09/28/2026', description: 'USDT Send via MetaMask', reference: 'SND-20260928-0049', channel: 'USDT_METAMASK', fee: 0.8 },
  { id: 'tx-012', type: 'topup', currency: 'USDT', amount: 500, direction: 'in', status: 'completed', date: '09/27/2026', description: 'Top Up via Binance', reference: 'TOP-20260927-0039', channel: 'USDT_BINANCE', fee: 3 },
];

export const MONTHLY_FLOW = [
  { month: 'May', phpIn: 45000, phpOut: 28000, krwIn: 1200000, krwOut: 600000, usdtIn: 800, usdtOut: 320 },
  { month: 'Jun', phpIn: 62000, phpOut: 31500, krwIn: 980000, krwOut: 750000, usdtIn: 950, usdtOut: 410 },
  { month: 'Jul', phpIn: 38000, phpOut: 42000, krwIn: 1500000, krwOut: 890000, usdtIn: 1100, usdtOut: 280 },
  { month: 'Aug', phpIn: 71000, phpOut: 25000, krwIn: 1800000, krwOut: 1100000, usdtIn: 670, usdtOut: 500 },
  { month: 'Sep', phpIn: 55000, phpOut: 38000, krwIn: 1350000, krwOut: 720000, usdtIn: 1400, usdtOut: 380 },
  { month: 'Oct', phpIn: 82500, phpOut: 34249, krwIn: 2100000, krwOut: 812550, usdtIn: 1250, usdtOut: 402 },
];

export const USER_BANK_ACCOUNTS = [
  { id: 'acct-001', bankId: 'bdo', currency: 'PHP' as const, accountNumber: '****-****-8821', accountName: 'Maria Santos', isPrimary: true },
  { id: 'acct-002', bankId: 'bpi', currency: 'PHP' as const, accountNumber: '****-****-3347', accountName: 'Maria Santos', isPrimary: false },
  { id: 'acct-003', bankId: 'gcash', currency: 'PHP' as const, accountNumber: '+63 917 *** 4421', accountName: 'Maria Santos', isPrimary: false },
  { id: 'acct-004', bankId: 'shinhan', currency: 'KRW' as const, accountNumber: '110-****-**8832', accountName: '산토스 마리아', isPrimary: true },
  { id: 'acct-005', bankId: 'kakao', currency: 'KRW' as const, accountNumber: '333-****-**1124', accountName: '산토스 마리아', isPrimary: false },
  { id: 'acct-006', bankId: 'toss', currency: 'KRW' as const, accountNumber: '100-****-**9967', accountName: '산토스 마리아', isPrimary: false },
];

export const USDT_WALLET_ADDRESS = '0x7a4B3c8D9E2F1a6b5C0d4E3f2A1B9c8D7e6F5a4';