'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TRANSACTIONS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyBadge from '@/components/ui/CurrencyBadge';
import { ChevronRight } from 'lucide-react';
import { RecentTransactionsSkeleton } from '@/components/ui/LoadingSkeleton';

export default function RecentTransactions() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return <RecentTransactionsSkeleton />;
  }

  const recent = TRANSACTIONS?.slice(0, 5);

  return (
    <div className="card-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          <p className="text-[10px] text-warning">Sample data</p>
        </div>
        <Link href="/transaction-history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          View all <ChevronRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {recent?.map((tx) => (
          <div key={`recent-${tx?.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
            <TxTypeIcon type={tx?.type} direction={tx?.direction} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{tx?.description}</p>
              <p className="text-xs text-muted-foreground">{tx?.date} · {tx?.reference}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-semibold font-tabular ${tx?.direction === 'in' ? 'text-accent' : 'text-danger'}`}>
                {tx?.direction === 'in' ? '+' : '-'}{fmtCurrency(tx?.amount, tx?.currency)}
              </p>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <CurrencyBadge currency={tx?.currency} />
                <StatusBadge status={tx?.status} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}