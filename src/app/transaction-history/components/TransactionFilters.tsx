'use client';
import React from 'react';
import type { TxType, TxStatus } from '@/lib/mockData';
import type { CurrencyCode } from '@/lib/currency';
import { Search, X } from 'lucide-react';

interface FilterState {
  search: string;
  currency: CurrencyCode | 'ALL';
  type: TxType | 'ALL';
  status: TxStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
}

interface TransactionFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const TYPE_OPTIONS: Array<{ value: TxType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Types' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'send', label: 'Send' },
  { value: 'receive', label: 'Receive' },
  { value: 'buy', label: 'Buy' },
  { value: 'topup', label: 'Top Up' },
];

const STATUS_OPTIONS: Array<{ value: TxStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

const CURRENCY_OPTIONS: Array<{ value: CurrencyCode | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Currencies' },
  { value: 'PHP', label: '₱ PHP' },
  { value: 'KRW', label: '₩ KRW' },
  { value: 'USDT', label: '$ USDT' },
];

export default function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ search: '', currency: 'ALL', type: 'ALL', status: 'ALL', dateFrom: '', dateTo: '' });
  }

  const hasActiveFilters =
    filters.search ||
    filters.currency !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-3">
      {/* Search + Clear */}
      <div className="flex gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {filters.search && (
            <button onClick={() => update('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-2.5 text-xs font-medium text-danger border border-danger/30 bg-danger/10 rounded-xl hover:bg-danger/20 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="space-y-2">
        {/* Dropdowns row */}
        <div className="flex gap-2 flex-wrap">
          {/* Currency */}
          <select
            value={filters.currency}
            onChange={(e) => update('currency', e.target.value as CurrencyCode | 'ALL')}
            className="flex-1 min-w-[120px] px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-all"
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={`curr-opt-${o.value}`} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => update('status', e.target.value as TxStatus | 'ALL')}
            className="flex-1 min-w-[120px] px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-all"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={`status-opt-${o.value}`} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update('dateFrom', e.target.value)}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-all"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update('dateTo', e.target.value)}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Type chips */}
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={`type-chip-${o.value}`}
              onClick={() => update('type', o.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filters.type === o.value
                  ? 'bg-primary text-white' :'bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}