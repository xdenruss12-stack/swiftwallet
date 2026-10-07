'use client';
import React from 'react';
import Link from 'next/link';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { fmtCurrency } from '@/lib/currency';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyBadge from '@/components/ui/CurrencyBadge';
import { ChevronRight } from 'lucide-react';
import { RecentTransactionsSkeleton } from '@/components/ui/LoadingSkeleton';

export default function RecentTransactions() {
  const { transactions: recent, isLoading, error } = useRealtimeTransactions({ limit: 5 });

  if (isLoading) {
    return <RecentTransactionsSkeleton />;
  }

  return (
    <div className="card-surface">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        <Link href="/transaction-history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          View all <ChevronRight size={12} />
        </Link>
      </div>
      {error ? (
        <div className="px-4 sm:px-5 py-8 text-center text-sm text-muted-foreground">{error}</div>
      ) : recent?.length === 0 ? (
        <div className="px-4 sm:px-5 py-8 text-center text-sm text-muted-foreground">No recent transactions</div>
      ) : (
        <div className="divide-y divide-border">
          {recent?.map((tx) => (
            <div key={`recent-${tx?.id}`} className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-secondary/30 transition-colors">
              <TxTypeIcon type={tx?.type} direction={tx?.direction} />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">{tx?.description}</p>
                <p className="text-xs text-muted-foreground truncate">{tx?.date} · {tx?.reference}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs sm:text-sm font-semibold font-tabular ${tx?.direction === 'in' ? 'text-accent' : 'text-danger'}`}>
                  {tx?.direction === 'in' ? '+' : '-'}{fmtCurrency(tx?.amount, tx?.currency)}
                </p>
                <div className="flex items-center gap-1 sm:gap-1.5 justify-end mt-1">
                  <CurrencyBadge currency={tx?.currency} />
                  <StatusBadge status={tx?.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}