import React from 'react';
import { fmtCurrency } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import BankLogo from '@/components/ui/BankLogo';
import { getBankById } from '@/lib/banks';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DepositConfirmationProps {
  currency: CurrencyCode;
  bankId: string;
  amount: number;
  reference: string;
  accountNumber: string;
  accountName: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function DepositConfirmation({
  currency,
  bankId,
  amount,
  reference,
  accountNumber,
  accountName,
  onConfirm,
  isLoading,
}: DepositConfirmationProps) {
  const bank = getBankById(bankId, currency as 'KRW' | 'PHP');

  function copyRef() {
    toast.success('Reference code copied');
  }
  function copyAcct() {
    toast.success('Account number copied');
  }

  return (
    <div className="space-y-5">
      <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl flex items-start gap-3">
        <CheckCircle2 size={18} className="text-accent flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Transfer these exact details</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your deposit will be credited within 1–2 business hours after confirmation.</p>
        </div>
      </div>

      {bank && (
        <div className="flex items-center gap-3 p-4 card-elevated rounded-xl">
          <BankLogo bank={bank} size="lg" />
          <div>
            <p className="text-sm font-semibold text-foreground">{bank.name}</p>
            <p className="text-xs text-muted-foreground">{currency} Bank Transfer</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {[
          { label: 'Account Number', value: accountNumber, copyFn: copyAcct },
          { label: 'Account Name', value: accountName, copyFn: null },
          { label: 'Amount', value: fmtCurrency(amount, currency), copyFn: null },
          { label: 'Reference Code', value: reference, copyFn: copyRef, highlight: true },
        ].map((row) => (
          <div key={`conf-${row.label}`} className={`flex items-center justify-between p-3 rounded-lg ${row.highlight ? 'bg-warning/10 border border-warning/30' : 'bg-secondary'}`}>
            <div>
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className={`text-sm font-semibold font-tabular mt-0.5 ${row.highlight ? 'text-warning' : 'text-foreground'}`}>{row.value}</p>
            </div>
            {row.copyFn && (
              <button onClick={row.copyFn} className="p-1.5 rounded-lg hover:bg-border/50 text-muted-foreground hover:text-foreground transition-colors">
                <Copy size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          "I've Completed the Transfer"
        )}
      </button>
    </div>
  );
}