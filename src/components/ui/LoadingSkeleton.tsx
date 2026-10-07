import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-secondary rounded-lg ${className}`} />;
}

export function WalletCardSkeleton() {
  return (
    <div className="card-surface p-5 border-2 border-border relative overflow-hidden">
      {/* Currency label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      {/* Balance */}
      <div className="mb-3">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-8 w-40" />
      </div>
      {/* Footer row */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function WalletGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <WalletCardSkeleton key={`wsk-${i}`} />
      ))}
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right flex-shrink-0 space-y-2">
        <Skeleton className="h-4 w-24 ml-auto" />
        <div className="flex items-center gap-1.5 justify-end">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RecentTransactionsSkeleton() {
  return (
    <div className="card-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="divide-y divide-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <TransactionRowSkeleton key={`trsk-${i}`} />
        ))}
      </div>
    </div>
  );
}

export function TransactionTableRowSkeleton() {
  return (
    <tr>
      <td className="px-5 py-3.5"><Skeleton className="w-9 h-9 rounded-xl" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-4 w-16" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-4 w-40" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-5 w-12 rounded-full" /></td>
      <td className="px-3 py-3.5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-4 w-24" /></td>
      <td className="px-3 py-3.5"><Skeleton className="h-4 w-28" /></td>
    </tr>
  );
}

export function TransactionTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {['w-10', 'w-16', 'w-40', 'w-20', 'w-24', 'w-20', 'w-24', 'w-28'].map((w, i) => (
                <th key={`th-sk-${i}`} className="px-3 py-3">
                  <Skeleton className={`h-3 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, i) => (
              <TransactionTableRowSkeleton key={`ttsk-${i}`} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BankCardSkeleton() {
  return (
    <div className="bank-card flex-col text-center py-3 opacity-60">
      <Skeleton className="w-10 h-10 rounded-xl mx-auto mb-1" />
      <Skeleton className="h-3 w-14 mx-auto" />
    </div>
  );
}

export function BankGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <BankCardSkeleton key={`bgsk-${i}`} />
      ))}
    </div>
  );
}