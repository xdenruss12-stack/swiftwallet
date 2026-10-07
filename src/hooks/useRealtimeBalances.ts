'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transactionService } from '@/lib/services/transactionService';
import type { WalletBalance } from '@/lib/mockData';
import type { CurrencyCode } from '@/lib/currency';
import { WALLET_BALANCES } from '@/lib/mockData';

interface UseRealtimeBalancesResult {
  balances: WalletBalance[];
  isLoading: boolean;
}

/**
 * Computes live wallet balances by aggregating completed transactions
 * from Supabase and subscribes to real-time changes.
 */
export function useRealtimeBalances(): UseRealtimeBalancesResult {
  const [balances, setBalances] = useState<WalletBalance[]>(WALLET_BALANCES);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const computeBalances = useCallback(async () => {
    try {
      const all = await transactionService.getAll();

      const currencies: CurrencyCode[] = ['PHP', 'KRW', 'USDT'];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const computed: WalletBalance[] = currencies.map((currency) => {
        const txs = all.filter((tx) => tx.currency === currency);

        // Available balance = sum of completed inflows - sum of completed outflows
        const balance = txs
          .filter((tx) => tx.status === 'completed')
          .reduce((acc, tx) => acc + (tx.direction === 'in' ? tx.amount : -tx.amount), 0);

        // Pending in/out
        const pendingIn = txs
          .filter((tx) => (tx.status === 'pending' || tx.status === 'processing') && tx.direction === 'in')
          .reduce((acc, tx) => acc + tx.amount, 0);

        const pendingOut = txs
          .filter((tx) => (tx.status === 'pending' || tx.status === 'processing') && tx.direction === 'out')
          .reduce((acc, tx) => acc + tx.amount, 0);

        // Monthly in/out (current month, all statuses except failed)
        const monthlyIn = txs
          .filter((tx) => {
            const d = new Date(tx.date);
            return tx.direction === 'in' && tx.status !== 'failed' && d >= startOfMonth;
          })
          .reduce((acc, tx) => acc + tx.amount, 0);

        const monthlyOut = txs
          .filter((tx) => {
            const d = new Date(tx.date);
            return tx.direction === 'out' && tx.status !== 'failed' && d >= startOfMonth;
          })
          .reduce((acc, tx) => acc + tx.amount, 0);

        // Fall back to mock balance if no transactions exist yet for this currency
        const mockBalance = WALLET_BALANCES.find((b) => b.currency === currency)!;
        return {
          currency,
          balance: txs.length > 0 ? Math.max(0, balance) : mockBalance.balance,
          pendingIn: txs.length > 0 ? pendingIn : mockBalance.pendingIn,
          pendingOut: txs.length > 0 ? pendingOut : mockBalance.pendingOut,
          monthlyIn: txs.length > 0 ? monthlyIn : mockBalance.monthlyIn,
          monthlyOut: txs.length > 0 ? monthlyOut : mockBalance.monthlyOut,
        };
      });

      setBalances(computed);
    } catch {
      // Keep existing balances on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    computeBalances();

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return;

      const channel = supabase
        .channel(`realtime-balances-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (isMounted) computeBalances();
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
  }, [computeBalances]);

  return { balances, isLoading };
}
