'use client';
import React from 'react';
import AppLayout from '@/components/AppLayout';
import UsdtWalletOverview from '@/components/UsdtWalletOverview';
import UsdtActionTabs from './components/UsdtActionTabs';
import UsdtTransactionList from './components/UsdtTransactionList';
import { useRealtimeBalances } from '@/hooks/useRealtimeBalances';
import { USDT_WALLET_ADDRESS } from '@/lib/mockData';
import { EXCHANGE_RATES } from '@/lib/currency';

export default function UsdtWalletPage() {
  const { balances, isLoading } = useRealtimeBalances();
  const usdtBalance = balances.find((b) => b.currency === 'USDT')!;

  return (
    <AppLayout activeRoute="/usdt-wallet">
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-base sm:text-xl font-semibold text-foreground">USDT Wallet</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Buy, send, and receive Tether USD</p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
          {/* Left: Balance + Actions */}
          <div className="xl:col-span-2 space-y-3 sm:space-y-4">
            <UsdtWalletOverview
              balance={usdtBalance?.balance ?? 0}
              address={USDT_WALLET_ADDRESS}
              phpRate={EXCHANGE_RATES['USDT_PHP']}
              krwRate={EXCHANGE_RATES['USDT_KRW']}
            />

            {/* Monthly stats */}
            <div className="card-surface p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="text-center p-3 bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Monthly In</p>
                <p className="text-base sm:text-lg font-bold font-tabular text-accent">
                  {isLoading ? '…' : `$${(usdtBalance?.monthlyIn ?? 0).toFixed(2)}`}
                </p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Monthly Out</p>
                <p className="text-base sm:text-lg font-bold font-tabular text-danger">
                  {isLoading ? '…' : `$${(usdtBalance?.monthlyOut ?? 0).toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Action Tabs + Transactions */}
          <div className="xl:col-span-3 space-y-3 sm:space-y-4">
            <UsdtActionTabs />
            <UsdtTransactionList />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}