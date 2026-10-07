'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyBadge from '@/components/ui/CurrencyBadge';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionTableProps {
  transactions: Transaction[];
}

type SortKey = 'date' | 'amount' | 'status' | 'type';
type SortDir = 'asc' | 'desc';

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const router = useRouter();

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
    if (sortKey === 'amount') cmp = a.amount - b.amount;
    if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
    if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-border" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  }

  function handleExport() {
    // Backend integration: GET /api/transactions/export
    toast.success('Export started — CSV will download shortly');
  }

  return (
    <div className="card-surface">
      {/* Table Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {total} transaction{total !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-lg hover:text-foreground hover:border-primary/50 transition-all"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Scrollable Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Type <SortIcon col="type" />
                </button>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currency</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                  Amount <SortIcon col="amount" />
                </button>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Status <SortIcon col="status" />
                </button>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Date <SortIcon col="date" />
                </button>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Download size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No transactions match your filters</p>
                    <p className="text-xs">Try adjusting your search or filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((tx) => (
                <tr
                  key={`tx-row-${tx.id}`}
                  onClick={() => router.push(`/transaction-history/${tx.id}`)}
                  className="hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <TxTypeIcon type={tx.type} direction={tx.direction} />
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-xs font-medium capitalize text-foreground">{tx.type}</span>
                  </td>
                  <td className="px-3 py-3.5 max-w-[200px]">
                    <p className="text-sm text-foreground truncate">{tx.description}</p>
                    {tx.fee && tx.fee > 0 && (
                      <p className="text-xs text-muted-foreground">Fee: {fmtCurrency(tx.fee, tx.currency)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <CurrencyBadge currency={tx.currency} />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className={`text-sm font-semibold font-tabular ${tx.direction === 'in' ? 'text-accent' : 'text-danger'}`}>
                      {tx.direction === 'in' ? '+' : '-'}{fmtCurrency(tx.amount, tx.currency)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-sm text-muted-foreground font-tabular">{tx.date}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-xs font-mono text-muted-foreground">{tx.reference}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="bg-secondary border border-border rounded-lg px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
            >
              {[5, 10, 20].map((n) => (
                <option key={`pp-${n}`} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}