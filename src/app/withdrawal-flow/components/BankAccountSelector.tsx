import React from 'react';
import { USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { getBankById } from '@/lib/banks';
import BankLogo from '@/components/ui/BankLogo';
import { CheckCircle2 } from 'lucide-react';

interface BankAccountSelectorProps {
  currency: 'PHP' | 'KRW';
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function BankAccountSelector({ currency, selectedId, onSelect }: BankAccountSelectorProps) {
  const accounts = USER_BANK_ACCOUNTS.filter((a) => a.currency === currency);

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No {currency} bank accounts linked.</p>
        <p className="text-xs mt-1">Add a bank account in Settings to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((acct) => {
        const bank = getBankById(acct.bankId, currency);
        const isSelected = selectedId === acct.id;
        return (
          <button
            key={`acct-${acct.id}`}
            onClick={() => onSelect(acct.id)}
            className={`bank-card w-full ${isSelected ? 'selected' : ''}`}
          >
            {bank && <BankLogo bank={bank} size="md" />}
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{bank?.name ?? acct.bankId}</p>
              <p className="text-xs text-muted-foreground font-mono">{acct.accountNumber}</p>
              <p className="text-xs text-muted-foreground">{acct.accountName}</p>
            </div>
            {acct.isPrimary && (
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">Primary</span>
            )}
            {isSelected && (
              <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}