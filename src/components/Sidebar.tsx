'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from './ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  History,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  WalletCards,
  UserCircle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Wallet Overview', href: '/', icon: <Wallet size={18} /> },
  { label: 'Deposit', href: '/deposit-wizard', icon: <ArrowDownToLine size={18} /> },
  { label: 'Withdraw', href: '/withdrawal-flow', icon: <ArrowUpFromLine size={18} /> },
  { label: 'USDT Wallet', href: '/usdt-wallet', icon: <CircleDollarSign size={18} /> },
  { label: 'Transactions', href: '/transaction-history', icon: <History size={18} />, badge: 1 },
  { label: 'KRW Withdrawal', href: '/krw-withdrawal-panel', icon: <WalletCards size={18} /> },
  { label: 'Profile', href: '/profile', icon: <UserCircle size={18} /> },
];

interface SidebarProps {
  activeRoute: string;
}

export default function Sidebar({ activeRoute }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <aside
      className="relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
        <div className="flex items-center gap-2">
          <AppLogo size={32} />
          {!collapsed && (
            <span className="font-bold text-foreground text-base tracking-tight whitespace-nowrap overflow-hidden">
              SwiftWallet
            </span>
          )}
        </div>
      </div>

      {/* User Badge */}
      {!collapsed && (
        <div className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {user?.user_metadata?.full_name
                  ? user.user_metadata.full_name.slice(0, 2).toUpperCase()
                  : user?.email?.slice(0, 2).toUpperCase() ?? 'SW'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.user_metadata?.full_name || 'Wallet User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span className="text-xs text-accent">Verified Account</span>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
            Wallet
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.href;
          return (
            <Link
              key={`nav-${item.href}`}
              href={item.href}
              className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-warning text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-2 py-3 border-t border-border space-y-1">
        <Link
          href="#"
          className={`sidebar-item ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Notifications' : undefined}
        >
          <Bell size={18} />
          {!collapsed && <span className="flex-1">Notifications</span>}
        </Link>
        <Link
          href="#"
          className={`sidebar-item ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span className="flex-1">Settings</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className={`sidebar-item w-full ${collapsed ? 'justify-center px-0' : ''} text-danger hover:bg-danger/10 hover:text-danger`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="flex-1 text-left">Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[88px] w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}