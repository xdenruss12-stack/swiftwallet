'use client';
import React from 'react';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { fmtCurrency } from '@/lib/currency';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import StatusBadge from '@/components/ui/StatusBadge';

export default function UsdtTransactionList() {
  const { transactions: usdtTxs, isLoading, error } = useRealtimeTransactions({ currency: 'USDT' });

  return (
    <div className="card-surface">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">USDT Transaction History</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isLoading ? 'Loading…' : `${usdtTxs?.length} transactions`}
        </p>
      </div>
      {error ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">{error}</div>
      ) : isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3]?.map((i) => (
            <div key={`usdt-skel-${i}`} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-secondary rounded w-2/3" />
                <div className="h-2.5 bg-secondary rounded w-1/2" />
              </div>
              <div className="text-right space-y-1.5 flex-shrink-0">
                <div className="h-3 bg-secondary rounded w-16" />
                <div className="h-2.5 bg-secondary rounded w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : usdtTxs?.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">No USDT transactions yet</div>
      ) : (
        <div className="divide-y divide-border">
          {usdtTxs?.map((tx) => (
            <div key={`usdt-tx-${tx?.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
              <TxTypeIcon type={tx?.type} direction={tx?.direction} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tx?.description}</p>
                <p className="text-xs text-muted-foreground">{tx?.date} · <span className="font-mono">{tx?.reference}</span></p>
                {tx?.fee && tx?.fee > 0 && (
                  <p className="text-xs text-muted-foreground">Fee: ${tx?.fee}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold font-tabular ${tx?.direction === 'in' ? 'text-accent' : 'text-danger'}`}>
                  {tx?.direction === 'in' ? '+' : '-'}{fmtCurrency(tx?.amount, 'USDT')}
                </p>
                <div className="mt-1">
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