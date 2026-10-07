'use client';
import React from 'react';
import { fmtCurrency } from '@/lib/currency';
import { Copy, ExternalLink, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface UsdtWalletOverviewProps {
  balance: number;
  address: string;
  phpRate: number;
  krwRate: number;
}

export default function UsdtWalletOverview({ balance, address, phpRate, krwRate }: UsdtWalletOverviewProps) {
  const shortAddr = `${address.slice(0, 8)}...${address.slice(-6)}`;

  function handleCopy() {
    // Backend integration: navigator.clipboard.writeText
    toast.success('Address copied to clipboard');
  }

  return (
    <div className="card-surface p-6 border-2 border-usdt/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 bg-usdt"
        style={{ transform: 'translate(30%, -30%)' }}
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: '#26A17B', color: '#fff' }}>
            ₮
          </div>
          <div>
            <p className="text-xs text-muted-foreground">USDT Balance</p>
            <p className="text-xs text-accent flex items-center gap-1">
              <TrendingUp size={10} /> Live
            </p>
          </div>
        </div>
        <span className="currency-tag bg-usdt/15 text-usdt border border-usdt/30">USDT</span>
      </div>
      <p className="balance-value text-usdt mb-2">{fmtCurrency(balance, 'USDT')}</p>
      <div className="flex gap-4 text-xs text-muted-foreground mb-4">
        <span>≈ {fmtCurrency(balance * phpRate, 'PHP')}</span>
        <span>≈ {fmtCurrency(balance * krwRate, 'KRW')}</span>
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-lg border border-border">
        <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{shortAddr}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Copy size={12} />
          Copy
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}