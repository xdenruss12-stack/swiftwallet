export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  initial: string;
}

export const KRW_BANKS: BankInfo[] = [
  { id: 'kb', name: 'KB국민은행', shortName: 'KB국민', color: '#FFBC00', textColor: '#1a1a1a', initial: 'KB' },
  { id: 'shinhan', name: '신한은행', shortName: '신한', color: '#0046FF', textColor: '#fff', initial: 'SH' },
  { id: 'woori', name: '우리은행', shortName: '우리', color: '#007BC7', textColor: '#fff', initial: 'WR' },
  { id: 'hana', name: '하나은행', shortName: '하나', color: '#00927B', textColor: '#fff', initial: 'HN' },
  { id: 'nh', name: 'NH농협은행', shortName: 'NH농협', color: '#006B2F', textColor: '#fff', initial: 'NH' },
  { id: 'ibk', name: 'IBK기업은행', shortName: 'IBK', color: '#0060AC', textColor: '#fff', initial: 'IB' },
  { id: 'kakao', name: '카카오뱅크', shortName: '카카오', color: '#FEE500', textColor: '#1a1a1a', initial: 'KK' },
  { id: 'toss', name: '토스뱅크', shortName: '토스', color: '#0064FF', textColor: '#fff', initial: 'TB' },
  { id: 'sc', name: 'SC제일은행', shortName: 'SC', color: '#1D8348', textColor: '#fff', initial: 'SC' },
  { id: 'busan', name: '부산은행', shortName: '부산', color: '#003087', textColor: '#fff', initial: 'BS' },
];

export const PH_BANKS: BankInfo[] = [
  { id: 'gcash', name: 'GCash', shortName: 'GCash', color: '#007DFF', textColor: '#fff', initial: 'GC' },
  { id: 'bdo', name: 'Banco de Oro', shortName: 'BDO', color: '#003087', textColor: '#fff', initial: 'BD' },
  { id: 'bpi', name: 'Bank of the Philippine Islands', shortName: 'BPI', color: '#CC0000', textColor: '#fff', initial: 'BP' },
  { id: 'metrobank', name: 'Metrobank', shortName: 'Metro', color: '#002868', textColor: '#fff', initial: 'MB' },
  { id: 'landbank', name: 'Landbank', shortName: 'Land', color: '#006400', textColor: '#fff', initial: 'LB' },
  { id: 'unionbank', name: 'UnionBank', shortName: 'Union', color: '#E31837', textColor: '#fff', initial: 'UB' },
  { id: 'maya', name: 'Maya (PayMaya)', shortName: 'Maya', color: '#00C853', textColor: '#fff', initial: 'MY' },
  { id: 'rcbc', name: 'RCBC', shortName: 'RCBC', color: '#005BAA', textColor: '#fff', initial: 'RC' },
  { id: 'pnb', name: 'Philippine National Bank', shortName: 'PNB', color: '#003087', textColor: '#fff', initial: 'PN' },
  { id: 'eastwest', name: 'EastWest Bank', shortName: 'EW', color: '#E87722', textColor: '#fff', initial: 'EW' },
];

export function getBankById(id: string, currency: 'KRW' | 'PHP'): BankInfo | undefined {
  const catalog = currency === 'KRW' ? KRW_BANKS : PH_BANKS;
  return catalog.find((b) => b.id === id);
}