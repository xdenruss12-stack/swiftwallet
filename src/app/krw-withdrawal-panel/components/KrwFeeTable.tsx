import React from 'react';
import { fmtCurrency } from '@/lib/currency';

interface KrwFeeTableProps {
  amount: number;
  paymentMethod?: 'bank' | 'stripe';
}

export default function KrwFeeTable({ amount, paymentMethod = 'bank' }: KrwFeeTableProps) {
  const isStripe = paymentMethod === 'stripe';

  // Bank transfer fees
  const bankTransferFee = 500;
  const bankProcessingFee = amount > 1000000 ? 1000 : 0;
  const bankTotalFee = bankTransferFee + bankProcessingFee;

  // Stripe fees: 2.9% + ₩350 fixed (Stripe KRW pricing)
  const stripePercentFee = Math.round(amount * 0.029);
  const stripeFixedFee = 350;
  const stripeTotalFee = stripePercentFee + stripeFixedFee;

  const totalFee = isStripe ? stripeTotalFee : bankTotalFee;
  const totalDeducted = amount + totalFee;
  const youReceive = amount;

  const rows = isStripe
    ? [
        { label: 'Withdrawal Amount', value: fmtCurrency(amount, 'KRW'), highlight: false },
        { label: 'Stripe Processing Fee (2.9%)', value: fmtCurrency(stripePercentFee, 'KRW'), highlight: false, note: 'Charged directly by Stripe' },
        { label: 'Stripe Fixed Fee', value: fmtCurrency(stripeFixedFee, 'KRW'), highlight: false, note: '₩350 per transaction' },
        { label: 'Total Deducted', value: fmtCurrency(totalDeducted, 'KRW'), highlight: true, danger: true },
        { label: 'You Receive', value: fmtCurrency(youReceive, 'KRW'), highlight: true, accent: true },
      ]
    : [
        { label: 'Withdrawal Amount', value: fmtCurrency(amount, 'KRW'), highlight: false },
        { label: 'Transfer Fee', value: fmtCurrency(bankTransferFee, 'KRW'), highlight: false, note: 'Standard domestic transfer' },
        { label: 'Processing Fee', value: bankProcessingFee > 0 ? fmtCurrency(bankProcessingFee, 'KRW') : 'Free', highlight: false, note: amount > 1000000 ? 'Applied for amounts over ₩1,000,000' : undefined },
        { label: 'Total Deducted', value: fmtCurrency(totalDeducted, 'KRW'), highlight: true, danger: true },
        { label: 'You Receive', value: fmtCurrency(youReceive, 'KRW'), highlight: true, accent: true },
      ];

  return (
    <div className="p-4 bg-secondary rounded-xl border border-border space-y-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Breakdown</p>
        {isStripe && (
          <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">Stripe Fees</span>
        )}
      </div>
      {rows.map((row) => (
        <div key={`fee-${row.label}`} className={`fee-row ${row.highlight ? 'font-semibold' : ''}`}>
          <div>
            <span className={row.highlight ? 'text-foreground' : 'text-muted-foreground'}>{row.label}</span>
            {row.note && <p className="text-xs text-muted-foreground/70 mt-0.5">{row.note}</p>}
          </div>
          <span className={`font-tabular ${row.accent ? 'text-accent' : row.danger ? 'text-danger' : 'text-foreground'}`}>
            {row.value}
          </span>
        </div>
      ))}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Processing time</span>
          <span className="font-medium text-foreground">
            {isStripe ? 'Instant card charge · 1–2 business days to bank' : 'Same day (before 15:00 KST) or next business day'}
          </span>
        </div>
      </div>
    </div>
  );
}