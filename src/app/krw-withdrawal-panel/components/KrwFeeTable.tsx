import React from 'react';
import { fmtCurrency } from '@/lib/currency';

interface KrwFeeTableProps {
  amount: number;
}

export default function KrwFeeTable({ amount }: KrwFeeTableProps) {
  const transferFee = 500;
  const processingFee = amount > 1000000 ? 1000 : 0;
  const totalFee = transferFee + processingFee;
  const totalDeducted = amount + totalFee;
  const youReceive = amount;

  return (
    <div className="p-4 bg-secondary rounded-xl border border-border space-y-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fee Breakdown</p>
      {[
        { label: 'Withdrawal Amount', value: fmtCurrency(amount, 'KRW'), highlight: false },
        { label: 'Transfer Fee', value: fmtCurrency(transferFee, 'KRW'), highlight: false, note: 'Standard domestic transfer' },
        { label: 'Processing Fee', value: processingFee > 0 ? fmtCurrency(processingFee, 'KRW') : 'Free', highlight: false, note: amount > 1000000 ? 'Applied for amounts over ₩1,000,000' : undefined },
        { label: 'Total Deducted', value: fmtCurrency(totalDeducted, 'KRW'), highlight: true, danger: true },
        { label: 'You Receive', value: fmtCurrency(youReceive, 'KRW'), highlight: true, accent: true },
      ].map((row) => (
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
          <span className="font-medium text-foreground">Same day (before 15:00 KST) or next business day</span>
        </div>
      </div>
    </div>
  );
}