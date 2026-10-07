'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import TxTypeIcon from '@/components/ui/TxTypeIcon';
import CurrencyBadge from '@/components/ui/CurrencyBadge';
import { TRANSACTIONS, USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import { PAYMENT_CHANNEL_CONFIG } from '@/lib/paymentChannels';
import { ArrowLeft, Calendar, Landmark, CreditCard,  } from 'lucide-react';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</span>
      <div className="text-sm text-foreground text-right flex-1">{children}</div>
    </div>
  );
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const tx = TRANSACTIONS.find((t) => t.id === id);

  if (!tx) {
    return (
      <AppLayout activeRoute="/transaction-history">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground text-sm">Transaction not found.</p>
          <button
            onClick={() => router.push('/transaction-history')}
            className="mt-4 text-primary text-sm hover:underline"
          >
            Back to Transaction History
          </button>
        </div>
      </AppLayout>
    );
  }

  const channelLabel =
    PAYMENT_CHANNEL_CONFIG[tx.channel as keyof typeof PAYMENT_CHANNEL_CONFIG]?.label ?? tx.channel;

  // Find linked bank account by matching channel/currency
  const linkedAccount = USER_BANK_ACCOUNTS.find(
    (acct) => acct.currency === tx.currency && acct.isPrimary
  );

  const netAmount = tx.direction === 'out' ? tx.amount + (tx.fee ?? 0) : tx.amount - (tx.fee ?? 0);

  return (
    <AppLayout activeRoute="/transaction-history">
      <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 space-y-5">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Transaction History
        </button>

        {/* Header Card */}
        <div className="card-surface p-5">
          <div className="flex items-start gap-4">
            <TxTypeIcon type={tx.type} direction={tx.direction} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold text-foreground capitalize">{tx.type}</h1>
                <CurrencyBadge currency={tx.currency} />
                <StatusBadge status={tx.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{tx.description}</p>
            </div>
          </div>

          {/* Amount Hero */}
          <div className="mt-5 pt-5 border-t border-border flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p
                className={`text-3xl font-bold font-tabular ${
                  tx.direction === 'in' ? 'text-accent' : 'text-danger'
                }`}
              >
                {tx.direction === 'in' ? '+' : '-'}
                {fmtCurrency(tx.amount, tx.currency)}
              </p>
            </div>
            {tx.fee !== undefined && tx.fee > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Net {tx.direction === 'out' ? 'Deducted' : 'Received'}</p>
                <p className="text-base font-semibold font-tabular text-foreground">
                  {fmtCurrency(Math.abs(netAmount), tx.currency)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Details Card */}
        <div className="card-surface px-5 py-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">
            Transaction Details
          </h2>

          <DetailRow label="Reference ID">
            <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded-lg">{tx.reference}</span>
          </DetailRow>

          <DetailRow label="Type">
            <span className="capitalize">{tx.type}</span>
          </DetailRow>

          <DetailRow label="Status">
            <div className="flex justify-end">
              <StatusBadge status={tx.status} />
            </div>
          </DetailRow>

          <DetailRow label="Timestamp">
            <div className="flex items-center justify-end gap-1.5">
              <Calendar size={13} className="text-muted-foreground" />
              <span className="font-tabular">{tx.date}</span>
            </div>
          </DetailRow>

          <DetailRow label="Currency">
            <div className="flex justify-end">
              <CurrencyBadge currency={tx.currency} />
            </div>
          </DetailRow>

          <DetailRow label="Direction">
            <span
              className={`capitalize font-medium ${
                tx.direction === 'in' ? 'text-accent' : 'text-danger'
              }`}
            >
              {tx.direction === 'in' ? 'Incoming' : 'Outgoing'}
            </span>
          </DetailRow>
        </div>

        {/* Fee Breakdown Card */}
        <div className="card-surface px-5 py-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">
            Fee Breakdown
          </h2>

          <DetailRow label="Gross Amount">
            <span className="font-tabular">{fmtCurrency(tx.amount, tx.currency)}</span>
          </DetailRow>

          <DetailRow label="Transaction Fee">
            {tx.fee && tx.fee > 0 ? (
              <span className="font-tabular text-warning">{fmtCurrency(tx.fee, tx.currency)}</span>
            ) : (
              <span className="text-accent text-xs font-medium">Free</span>
            )}
          </DetailRow>

          <DetailRow label="Net Amount">
            <span className="font-tabular font-semibold">
              {fmtCurrency(Math.abs(netAmount), tx.currency)}
            </span>
          </DetailRow>
        </div>

        {/* Payment & Account Card */}
        <div className="card-surface px-5 py-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">
            Payment Channel & Account
          </h2>

          <DetailRow label="Payment Channel">
            <div className="flex items-center justify-end gap-1.5">
              <CreditCard size={13} className="text-muted-foreground" />
              <span>{channelLabel}</span>
            </div>
          </DetailRow>

          {linkedAccount && (
            <>
              <DetailRow label="Linked Account">
                <div className="flex items-center justify-end gap-1.5">
                  <Landmark size={13} className="text-muted-foreground" />
                  <span className="font-tabular">{linkedAccount.accountNumber}</span>
                </div>
              </DetailRow>
              <DetailRow label="Account Name">
                <span>{linkedAccount.accountName}</span>
              </DetailRow>
            </>
          )}

          <DetailRow label="Description">
            <span className="text-muted-foreground">{tx.description}</span>
          </DetailRow>
        </div>
      </div>
    </AppLayout>
  );
}
