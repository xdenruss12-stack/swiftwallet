'use client';
import React from 'react';
import { fmtCurrency, fmtCompact } from '@/lib/currency';
import type { WalletBalance } from '@/lib/mockData';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { WalletGridSkeleton } from '@/components/ui/LoadingSkeleton';

interface CollectionWalletOverviewProps {
  balances: WalletBalance[];
  isLoading?: boolean;
}

const CURRENCY_COLORS: Record<string, { ring: string; dot: string; label: string }> = {
  PHP: { ring: 'border-border', dot: 'bg-muted-foreground', label: 'text-muted-foreground' },
  KRW: { ring: 'border-border', dot: 'bg-muted-foreground', label: 'text-muted-foreground' },
  USDT: { ring: 'border-border', dot: 'bg-muted-foreground', label: 'text-muted-foreground' },
};

export default function CollectionWalletOverview({ balances, isLoading = false }: CollectionWalletOverviewProps) {
  if (isLoading) {
    return <WalletGridSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
      {balances.map((w) => {
        const c = CURRENCY_COLORS[w.currency];
        const netFlow = w.monthlyIn - w.monthlyOut;
        const isPositive = netFlow >= 0;
        const hasPending = w.pendingIn > 0 || w.pendingOut > 0;
        return (
          <div
            key={`wallet-${w.currency}`}
            className={`card-surface p-4 border-2 ${c.ring} relative overflow-hidden`}
          >
            {/* Subtle bg accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 ${c.dot}`}
              style={{ transform: 'translate(30%, -30%)' }}
            />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className={`currency-tag ${c.label} bg-transparent border-none font-semibold`}>
                  {w.currency}
                </span>
              </div>
              {hasPending && (
                <div className="flex items-center gap-1 text-warning">
                  <AlertCircle size={12} />
                  <span className="text-xs font-medium">Pending</span>
                </div>
              )}
            </div>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              <p className="balance-value text-foreground text-lg sm:text-xl leading-tight break-all">
                {fmtCurrency(w.balance, w.currency)}
              </p>
            </div>
            {hasPending && (
              <div className="mb-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
                {w.pendingIn > 0 && (
                  <p className="text-xs text-warning">
                    +{fmtCompact(w.pendingIn, w.currency)} pending deposit
                  </p>
                )}
                {w.pendingOut > 0 && (
                  <p className="text-xs text-warning">
                    -{fmtCompact(w.pendingOut, w.currency)} pending withdrawal
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <div className="text-xs text-muted-foreground min-w-0">
                <span className="text-secondary-foreground">↑ {fmtCompact(w.monthlyIn, w.currency)}</span>
                <span className="mx-1 text-border">|</span>
                <span className="text-secondary-foreground">↓ {fmtCompact(w.monthlyOut, w.currency)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-secondary-foreground flex-shrink-0">
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="truncate">{isPositive ? '+' : ''}{fmtCompact(Math.abs(netFlow), w.currency)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}