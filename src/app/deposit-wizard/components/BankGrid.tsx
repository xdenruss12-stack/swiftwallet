'use client';
import React from 'react';
import type { BankInfo } from '@/lib/banks';
import BankLogo from '@/components/ui/BankLogo';
import { isPaymentChannelEnabled } from '@/lib/paymentChannels';
import { Lock } from 'lucide-react';
import { BankGridSkeleton } from '@/components/ui/LoadingSkeleton';

interface BankGridProps {
  banks: BankInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currency: 'KRW' | 'PHP';
  isLoading?: boolean;
}

export default function BankGrid({ banks, selectedId, onSelect, currency, isLoading = false }: BankGridProps) {
  if (isLoading) {
    return <BankGridSkeleton count={banks.length || 10} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {banks.map((bank) => {
        const channelKey = currency === 'KRW' ? 'KRW_BANK_TRANSFER' : bank.id === 'gcash' ? 'PHP_GCASH' : 'PHP_BANK_TRANSFER';
        const enabled = isPaymentChannelEnabled(channelKey as Parameters<typeof isPaymentChannelEnabled>[0]);
        const isSelected = selectedId === bank.id;

        return (
          <button
            key={`bank-${bank.id}`}
            onClick={() => enabled && onSelect(bank.id)}
            disabled={!enabled}
            className={`bank-card flex-col text-center py-3 relative ${isSelected ? 'selected' : ''} ${!enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {!enabled && (
              <div className="absolute top-1.5 right-1.5">
                <Lock size={10} className="text-muted-foreground" />
              </div>
            )}
            <BankLogo bank={bank} size="md" />
            <span className="text-xs font-medium text-foreground mt-1 leading-tight">{bank.shortName}</span>
            {isSelected && (
              <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}