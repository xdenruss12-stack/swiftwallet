import React from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, Send, History, WalletCards } from 'lucide-react';

export default function QuickActions() {
  const actions = [
    { label: 'Deposit', href: '/deposit-wizard', icon: <ArrowDownToLine size={20} />, color: 'text-secondary-foreground' },
    { label: 'Withdraw', href: '/withdrawal-flow', icon: <ArrowUpFromLine size={20} />, color: 'text-secondary-foreground' },
    { label: 'Send USDT', href: '/usdt-wallet', icon: <Send size={20} />, color: 'text-secondary-foreground' },
    { label: 'KRW Out', href: '/krw-withdrawal-panel', icon: <WalletCards size={20} />, color: 'text-secondary-foreground' },
    { label: 'History', href: '/transaction-history', icon: <History size={20} />, color: 'text-secondary-foreground' },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {actions?.map((a) => (
        <Link
          key={`qa-${a?.href}`}
          href={a?.href}
          className="quick-action-btn min-h-[64px] sm:min-h-[72px] flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
        >
          <span className={a?.color}>{a?.icon}</span>
          <span className="text-center leading-tight text-[10px] sm:text-xs font-medium text-muted-foreground">{a?.label}</span>
        </Link>
      ))}
    </div>
  );
}