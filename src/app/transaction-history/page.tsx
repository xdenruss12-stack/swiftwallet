'use client';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import TransactionFilters from './components/TransactionFilters';
import TransactionTable from './components/TransactionTable';
import { TRANSACTIONS } from '@/lib/mockData';
import type { TxType, TxStatus } from '@/lib/mockData';
import type { CurrencyCode } from '@/lib/currency';
import { TransactionTableSkeleton } from '@/components/ui/LoadingSkeleton';

interface FilterState {
  search: string;
  currency: CurrencyCode | 'ALL';
  type: TxType | 'ALL';
  status: TxStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  currency: 'ALL',
  type: 'ALL',
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export default function TransactionHistoryPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((tx) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!tx.description.toLowerCase().includes(q) && !tx.reference.toLowerCase().includes(q)) return false;
      }
      if (filters.currency !== 'ALL' && tx.currency !== filters.currency) return false;
      if (filters.type !== 'ALL' && tx.type !== filters.type) return false;
      if (filters.status !== 'ALL' && tx.status !== filters.status) return false;
      return true;
    });
  }, [filters]);

  // Summary stats
  const completedCount = TRANSACTIONS.filter((t) => t.status === 'completed').length;
  const pendingCount = TRANSACTIONS.filter((t) => t.status === 'pending').length;
  const processingCount = TRANSACTIONS.filter((t) => t.status === 'processing').length;
  const failedCount = TRANSACTIONS.filter((t) => t.status === 'failed').length;

  return (
    <AppLayout activeRoute="/transaction-history">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sample activity across PHP, KRW, and USDT. Swiftpay payment status is shown after checkout.
          </p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Completed', count: completedCount, className: 'status-completed' },
            { label: 'Pending', count: pendingCount, className: 'status-pending' },
            { label: 'Processing', count: processingCount, className: 'status-processing' },
            { label: 'Failed', count: failedCount, className: 'status-failed' },
          ].map((s) => (
            <div key={`summary-${s.label}`} className="card-surface p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`text-base font-bold font-tabular px-2 py-0.5 rounded-lg ${s.className}`}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <TransactionFilters filters={filters} onChange={setFilters} />

        {/* Table */}
        {isLoading ? (
          <TransactionTableSkeleton rows={8} />
        ) : (
          <TransactionTable transactions={filtered} />
        )}
      </div>
    </AppLayout>
  );
}