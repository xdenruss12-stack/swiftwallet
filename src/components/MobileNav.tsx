import React from 'react';
import Link from 'next/link';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, History, UserCircle } from 'lucide-react';

interface MobileNavProps {
  activeRoute: string;
}

const MOB_NAV = [
  { label: 'Overview', href: '/', icon: <Wallet size={22} /> },
  { label: 'Deposit', href: '/deposit-wizard', icon: <ArrowDownToLine size={22} /> },
  { label: 'Withdraw', href: '/withdrawal-flow', icon: <ArrowUpFromLine size={22} /> },
  { label: 'USDT', href: '/usdt-wallet', icon: <CircleDollarSign size={22} /> },
  { label: 'History', href: '/transaction-history', icon: <History size={22} /> },
  { label: 'Profile', href: '/profile', icon: <UserCircle size={22} /> },
];

export default function MobileNav({ activeRoute }: MobileNavProps) {
  return (
    <nav className="bg-card border-t border-border px-1 pt-2 pb-3 flex items-center justify-around safe-area-bottom">
      {MOB_NAV.map((item) => {
        const isActive = activeRoute === item.href;
        return (
          <Link
            key={`mob-nav-${item.href}`}
            href={item.href}
            className={`flex flex-col items-center gap-1 min-w-[48px] px-2 py-1.5 rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-primary bg-primary/10' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}