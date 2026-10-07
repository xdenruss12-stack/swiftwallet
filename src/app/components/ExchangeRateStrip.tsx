import React from 'react';
import { EXCHANGE_RATES } from '@/lib/currency';
import { ArrowLeftRight } from 'lucide-react';

export default function ExchangeRateStrip() {
  const rates = [
    { pair: 'PHP → KRW', value: EXCHANGE_RATES?.['PHP_KRW'], label: '₱1 = ₩19.74' },
    { pair: 'KRW → PHP', value: EXCHANGE_RATES?.['KRW_PHP'], label: '₩1 = ₱0.0507' },
    { pair: 'USDT → PHP', value: EXCHANGE_RATES?.['USDT_PHP'], label: '$1 = ₱57.14' },
    { pair: 'USDT → KRW', value: EXCHANGE_RATES?.['USDT_KRW'], label: '$1 = ₩1,338.5' },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-secondary/50 border border-border rounded-xl overflow-x-auto scrollbar-thin">
      <ArrowLeftRight size={12} className="text-muted-foreground flex-shrink-0 mr-1" />
      {rates?.map((r, i) => (
        <React.Fragment key={`rate-${r?.pair}`}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{r?.pair}</span>
            <span className="text-xs font-semibold text-foreground font-tabular">{r?.label}</span>
          </div>
          {i < rates?.length - 1 && (
            <span className="text-border mx-2 flex-shrink-0">·</span>
          )}
        </React.Fragment>
      ))}
      <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">Live rates</span>
    </div>
  );
}