'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import CollectionWalletOverview from '@/components/CollectionWalletOverview';
import ExchangeRateStrip from './components/ExchangeRateStrip';
import RecentTransactions from './components/RecentTransactions';
import QuickActions from './components/QuickActions';
import WalletFlowChartWrapper from './components/WalletFlowChartWrapper';
import { WALLET_BALANCES } from '@/lib/mockData';
import { RefreshCw } from 'lucide-react';
import type { WalletBalance } from '@/lib/mockData';

interface WalletSummary {
  balance: number;
  monthlyIn: number;
  monthlyOut: number;
  pendingIn: number;
  pendingOut: number;
  updatedAt: string;
}

export default function WalletOverviewPage() {
  const [balances, setBalances] = useState<WalletBalance[] | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadWalletSummary = useCallback(async () => {
    const response = await fetch('/api/wallet/summary', { cache: 'no-store' });
    const result = (await response.json()) as WalletSummary | { error?: string };
    if (!response.ok || !('balance' in result)) {
      throw new Error('Unable to load your PHP wallet balance.');
    }

    const phpBalance: WalletBalance = {
      currency: 'PHP',
      balance: result.balance,
      monthlyIn: result.monthlyIn,
      monthlyOut: result.monthlyOut,
      pendingIn: result.pendingIn,
      pendingOut: result.pendingOut,
    };
    setBalances([
      phpBalance,
      ...WALLET_BALANCES.filter((balance) => balance.currency !== 'PHP'),
    ]);
    setLastUpdated(result.updatedAt);
    setBalanceError('');
  }, []);

  useEffect(() => {
    loadWalletSummary()
      .catch((error: unknown) => {
        setBalanceError(error instanceof Error ? error.message : 'Unable to load wallet balance.');
      })
      .finally(() => setIsLoading(false));
  }, [loadWalletSummary]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setIsLoading(true);
    try {
      await loadWalletSummary();
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Unable to load wallet balance.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  return (
    <AppLayout activeRoute="/">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Wallet Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lastUpdated ? `PHP balance checked ${new Date(lastUpdated).toLocaleString()}` : 'PHP balance from confirmed Swiftpay deposits'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Exchange Rate Strip */}
        <ExchangeRateStrip />

        {/* Currency Balance Cards */}
        {balanceError ? (
          <div className="card-surface flex items-center justify-between gap-4 p-4" role="alert">
            <p className="text-sm text-danger">{balanceError}</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        ) : balances ? (
          <CollectionWalletOverview
            balances={balances}
            isLoading={isLoading}
            demoCurrencies={['KRW', 'USDT']}
          />
        ) : (
          <CollectionWalletOverview balances={[]} isLoading={isLoading} />
        )}

        {/* Quick Actions */}
        <div className="card-surface p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
          <QuickActions />
        </div>

        {/* Flow Chart + Recent Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <WalletFlowChartWrapper />
          </div>
          <div className="xl:col-span-2">
            <RecentTransactions />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}