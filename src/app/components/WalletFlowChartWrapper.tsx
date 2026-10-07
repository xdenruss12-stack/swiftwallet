'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const WalletFlowChart = dynamic(() => import('./WalletFlowChart'), { ssr: false });

const CURRENCIES = ['PHP', 'KRW', 'USDT'] as const;
type Currency = (typeof CURRENCIES)[number];

export default function WalletFlowChartWrapper() {
  const [active, setActive] = useState<Currency>('PHP');

  return (
    <div className="card-surface p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Monthly Flow</h2>
          <p className="text-xs text-muted-foreground">Sample data · last 6 months</p>
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          {CURRENCIES.map((c) => (
            <button
              key={`tab-${c}`}
              onClick={() => setActive(c)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${
                active === c
                  ? c === 'PHP' ? 'bg-php/20 text-php' : c === 'KRW' ? 'bg-krw/20 text-krw' : 'bg-usdt/20 text-usdt' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <WalletFlowChart activeCurrency={active} />
    </div>
  );
}