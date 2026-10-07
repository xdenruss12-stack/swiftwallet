'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transactionService } from '@/lib/services/transactionService';
import type { Transaction } from '@/lib/mockData';
import type { CurrencyCode } from '@/lib/currency';

interface UseRealtimeTransactionsOptions {
  /** Filter to a specific currency. Omit for all currencies. */
  currency?: CurrencyCode;
  /** Limit results (for recent-activity panels). Omit for all. */
  limit?: number;
}

interface UseRealtimeTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRealtimeTransactions(
  options: UseRealtimeTransactionsOptions = {}
): UseRealtimeTransactionsResult {
  const { currency, limit } = options;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const data = limit
        ? await transactionService.getRecent(limit)
        : await transactionService.getAll();

      const filtered = currency
        ? data.filter((tx) => tx.currency === currency)
        : data;

      setTransactions(filtered);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [currency, limit]);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    fetchTransactions();

    // Set up real-time subscription
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return;

      const channel = supabase
        .channel(`realtime-transactions-${user.id}-${currency ?? 'all'}-${limit ?? 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Re-fetch on any change to get the latest ordered data
            if (isMounted) {
              fetchTransactions();
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      isMounted = false;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchTransactions, currency, limit]);

  return {
    transactions,
    isLoading,
    error,
    refresh: fetchTransactions,
  };
}
