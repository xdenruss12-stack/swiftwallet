import React from 'react';
import { EXCHANGE_RATES } from '@/lib/currency';
import { TrendingUp } from 'lucide-react';

export default function UsdtRateStrip() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'USDT → PHP', value: `₱${EXCHANGE_RATES?.['USDT_PHP']?.toFixed(2)}`, change: '+0.12%', positive: true },
        { label: 'USDT → KRW', value: `₩${EXCHANGE_RATES?.['USDT_KRW']?.toLocaleString()}`, change: '-0.08%', positive: false },
      ]?.map((r) => (
        <div key={`rate-strip-${r?.label}`} className="card-elevated p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{r?.label}</p>
            <p className="text-sm font-bold font-tabular text-foreground mt-0.5">{r?.value}</p>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${r?.positive ? 'text-accent' : 'text-danger'}`}>
            <TrendingUp size={12} className={r?.positive ? '' : 'rotate-180'} />
            {r?.change}
          </div>
        </div>
      ))}
    </div>
  );
}