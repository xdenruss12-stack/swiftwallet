import React from 'react';
import { TRANSACTIONS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import StatusBadge from '@/components/ui/StatusBadge';

export default function UsdtTransactionList() {
  const usdtTxs = TRANSACTIONS?.filter((t) => t?.currency === 'USDT');

  return (
    <div className="card-surface">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">USDT Transaction History</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{usdtTxs?.length} transactions</p>
      </div>
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
    </div>
  );
}