'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import BankLogo from '@/components/ui/BankLogo';
import { getBankById } from '@/lib/banks';
import { USER_BANK_ACCOUNTS, WALLET_BALANCES } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Bell,
  Lock,
  ChevronRight,
  Edit2,
  Star,
  ArrowUpFromLine,
  ArrowDownToLine,
  Globe,
} from 'lucide-react';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

function SettingRow({ icon, label, description, action, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/60 transition-colors rounded-xl text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action ?? <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

const KYC_TIERS = [
  {
    tier: 'Tier 1',
    label: 'Basic Verification',
    status: 'completed' as const,
    description: 'Email & phone verified',
    depositLimit: 50_000,
    withdrawLimit: 30_000,
    currency: 'PHP',
  },
  {
    tier: 'Tier 2',
    label: 'Identity Verified',
    status: 'completed' as const,
    description: 'Government ID submitted',
    depositLimit: 500_000,
    withdrawLimit: 200_000,
    currency: 'PHP',
  },
  {
    tier: 'Tier 3',
    label: 'Enhanced Due Diligence',
    status: 'pending' as const,
    description: 'Proof of address required',
    depositLimit: 2_000_000,
    withdrawLimit: 1_000_000,
    currency: 'PHP',
  },
];

const TX_LIMITS = [
  { label: 'PHP Daily Deposit', used: 25_000, max: 500_000, currency: 'PHP' as const, color: 'var(--php)' },
  { label: 'PHP Daily Withdrawal', used: 8_500, max: 200_000, currency: 'PHP' as const, color: 'var(--php)' },
  { label: 'KRW Daily Deposit', used: 500_000, max: 5_000_000, currency: 'KRW' as const, color: 'var(--krw)' },
  { label: 'KRW Daily Withdrawal', used: 250_000, max: 2_000_000, currency: 'KRW' as const, color: 'var(--krw)' },
  { label: 'USDT Daily Send', used: 150, max: 5_000, currency: 'USDT' as const, color: 'var(--usdt)' },
];

export default function ProfilePage() {
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  const phpBalance = WALLET_BALANCES.find((b) => b.currency === 'PHP')!;
  const krwBalance = WALLET_BALANCES.find((b) => b.currency === 'KRW')!;
  const usdtBalance = WALLET_BALANCES.find((b) => b.currency === 'USDT')!;

  const phpAccounts = USER_BANK_ACCOUNTS.filter((a) => a.currency === 'PHP');
  const krwAccounts = USER_BANK_ACCOUNTS.filter((a) => a.currency === 'KRW');

  return (
    <AppLayout activeRoute="/profile">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Account details, KYC status, and settings</p>
        </div>

        {/* Account Card */}
        <div className="card-surface p-5">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">MS</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-card flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">Maria Santos</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                  Verified
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Member since September 2024</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="text-center p-2.5 bg-secondary rounded-xl">
                  <p className="text-xs text-muted-foreground mb-0.5">PHP</p>
                  <p className="text-sm font-bold font-tabular text-php">{fmtCurrency(phpBalance.balance, 'PHP')}</p>
                </div>
                <div className="text-center p-2.5 bg-secondary rounded-xl">
                  <p className="text-xs text-muted-foreground mb-0.5">KRW</p>
                  <p className="text-sm font-bold font-tabular text-krw">{fmtCurrency(krwBalance.balance, 'KRW')}</p>
                </div>
                <div className="text-center p-2.5 bg-secondary rounded-xl">
                  <p className="text-xs text-muted-foreground mb-0.5">USDT</p>
                  <p className="text-sm font-bold font-tabular text-usdt">${usdtBalance.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <button className="flex-shrink-0 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
              <Edit2 size={16} />
            </button>
          </div>

          {/* Personal Info */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: <Mail size={14} />, label: 'Email', value: 'maria.s@swiftwallet.ph' },
              { icon: <Phone size={14} />, label: 'Phone', value: '+63 917 *** 4421' },
              { icon: <MapPin size={14} />, label: 'Country', value: 'Philippines / South Korea' },
              { icon: <Globe size={14} />, label: 'Account ID', value: 'SWF-2024-00182' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Status */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">KYC Verification</h3>
          </div>
          <div className="space-y-3">
            {KYC_TIERS.map((tier, idx) => {
              const isCompleted = tier.status === 'completed';
              const isPending = tier.status === 'pending';
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-accent/5 border-accent/20'
                      : isPending
                      ? 'bg-warning/5 border-warning/20' :'bg-secondary border-border'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-accent/15 text-accent' : isPending ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={18} /> : isPending ? <Clock size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tier.tier}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isCompleted ? 'bg-accent/15 text-accent' : isPending ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {isCompleted ? 'Completed' : isPending ? 'Pending' : 'Locked'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowDownToLine size={11} />
                      <span>Dep {fmtCurrency(tier.depositLimit, tier.currency as 'PHP')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <ArrowUpFromLine size={11} />
                      <span>Wth {fmtCurrency(tier.withdrawLimit, tier.currency as 'PHP')}</span>
                    </div>
                  </div>
                  {isPending && (
                    <button className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-warning/15 text-warning border border-warning/25 hover:bg-warning/25 transition-colors">
                      Verify
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Limits */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">Transaction Limits</h3>
            <span className="ml-auto text-xs text-muted-foreground">Resets daily at 00:00 UTC</span>
          </div>
          <div className="space-y-4">
            {TX_LIMITS.map((limit) => {
              const pct = Math.min((limit.used / limit.max) * 100, 100);
              const isHigh = pct > 80;
              return (
                <div key={limit.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{limit.label}</span>
                    <span className="text-xs font-tabular text-muted-foreground">
                      {fmtCurrency(limit.used, limit.currency)} / {fmtCurrency(limit.max, limit.currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isHigh ? 'var(--warning)' : limit.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% used</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked Bank Accounts */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">Linked Bank Accounts</h3>
          </div>

          {/* PHP Accounts */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">Philippine Peso (PHP)</p>
            <div className="space-y-2">
              {phpAccounts.map((acct) => {
                const bank = getBankById(acct.bankId, 'PHP');
                return (
                  <div key={acct.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
                    {bank && <BankLogo bank={bank} size="md" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{acct.accountName}</p>
                        {acct.isPrimary && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                            <Star size={9} />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-tabular">{acct.accountNumber}</p>
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-border">
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KRW Accounts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">Korean Won (KRW)</p>
            <div className="space-y-2">
              {krwAccounts.map((acct) => {
                const bank = getBankById(acct.bankId, 'KRW');
                return (
                  <div key={acct.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
                    {bank && <BankLogo bank={bank} size="md" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{acct.accountName}</p>
                        {acct.isPrimary && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                            <Star size={9} />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-tabular">{acct.accountNumber}</p>
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-border">
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            + Add Bank Account
          </button>
        </div>

        {/* Account Settings */}
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <User size={18} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">Account Settings</h3>
          </div>

          {/* Notifications */}
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Notifications</p>
            <div className="space-y-1">
              {[
                { label: 'Email Notifications', desc: 'Transaction alerts & updates', value: notifEmail, set: setNotifEmail },
                { label: 'SMS Notifications', desc: 'OTP & security alerts', value: notifSms, set: setNotifSms },
                { label: 'Push Notifications', desc: 'Real-time app alerts', value: notifPush, set: setNotifPush },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-secondary/60 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">
                    <Bell size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.value)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      item.value ? 'bg-primary' : 'bg-secondary border border-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        item.value ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Security</p>
            <div className="space-y-1">
              <SettingRow
                icon={<Lock size={16} />}
                label="Change Password"
                description="Last changed 30 days ago"
              />
              <SettingRow
                icon={<Shield size={16} />}
                label="Two-Factor Authentication"
                description="Authenticator app enabled"
                action={
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                    On
                  </span>
                }
              />
              <SettingRow
                icon={<Globe size={16} />}
                label="Active Sessions"
                description="2 devices logged in"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
