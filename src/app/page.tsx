'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import CollectionWalletOverview from '@/components/CollectionWalletOverview';
import ExchangeRateStrip from './components/ExchangeRateStrip';
import RecentTransactions from './components/RecentTransactions';
import QuickActions from './components/QuickActions';
import WalletFlowChartWrapper from './components/WalletFlowChartWrapper';
import { useRealtimeBalances } from '@/hooks/useRealtimeBalances';
import { RefreshCw } from 'lucide-react';

export default function WalletOverviewPage() {
  const { balances, isLoading } = useRealtimeBalances();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleRefresh() {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  }

  return (
    <AppLayout activeRoute="/">
      <div className="max-w-screen-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 xl:px-10 2xl:px-16 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-semibold text-foreground truncate">Wallet Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Last updated: Oct 06, 2026 at 21:11 UTC</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150 disabled:opacity-60 flex-shrink-0 min-h-[36px]"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Exchange Rate Strip */}
        <ExchangeRateStrip />

        {/* Currency Balance Cards */}
        <CollectionWalletOverview balances={balances} isLoading={isLoading} />

        {/* Quick Actions */}
        <div className="card-surface p-3 sm:p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
          <QuickActions />
        </div>

        {/* Flow Chart + Recent Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
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