'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

type AdminTab = 'overview' | 'users' | 'wallets' | 'merchants' | 'payments' | 'settings' | 'audit';
type PaymentStatus = 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELED' | 'EXPIRED' | 'FAILED';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
}

interface WalletRecord {
  user_id: string;
  email: string;
  created_at: string;
  balance_php: number;
  is_frozen: boolean;
  freeze_reason: string | null;
}

interface MerchantRecord {
  id: string;
  user_id: string;
  email: string;
  business_name: string;
  business_type: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

interface DepositRecord {
  id: string;
  reference_no: string;
  user_id: string;
  email: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
}

interface AuditRecord {
  id: number;
  actor_id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface Overview {
  user_count: number;
  merchant_count: number;
  active_merchant_count: number;
  frozen_wallet_count: number;
  wallet_balance_php: number;
  pending_deposit_count: number;
  pending_deposit_total_php: number;
  wallets: WalletRecord[];
  merchants: MerchantRecord[];
  deposits: DepositRecord[];
  settings: {
    platform_name?: string;
    support_email?: string;
    deposits_enabled?: boolean;
  };
  audit_log: AuditRecord[];
}

const TABS: { id: AdminTab; label: string; icon: typeof ShieldCheck }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'merchants', label: 'Merchants', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'audit', label: 'Audit log', icon: ClipboardList },
];

const php = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [merchantUserId, setMerchantUserId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('other');
  const [freezeTarget, setFreezeTarget] = useState<WalletRecord | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [depositFilter, setDepositFilter] = useState<'ALL' | PaymentStatus>('ALL');

  const loadOverview = useCallback(async () => {
    const result = await requestJson<Overview>('/api/admin/overview', { cache: 'no-store' });
    setOverview(result);
  }, []);

  const loadUsers = useCallback(async (page: number) => {
    const result = await requestJson<{
      users: PlatformUser[];
      total: number | null;
    }>(`/api/admin/users?page=${page}`, { cache: 'no-store' });
    setUsers(result.users);
    setTotalUsers(result.total);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadOverview(), loadUsers(userPage)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load administrator data');
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadUsers, userPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleDeposits = useMemo(
    () =>
      overview?.deposits.filter(
        (deposit) => depositFilter === 'ALL' || deposit.status === depositFilter
      ) ?? [],
    [depositFilter, overview?.deposits]
  );

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(successMessage);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The action could not be completed');
    } finally {
      setBusy(false);
    }
  }

  async function setUserSuspended(user: PlatformUser) {
    await runAction(
      () =>
        requestJson('/api/admin/users', {
          method: 'PATCH',
          body: JSON.stringify({ userId: user.id, suspended: !user.bannedUntil }),
        }),
      user.bannedUntil ? 'User access restored' : 'User suspended'
    );
  }

  async function toggleWallet(wallet: WalletRecord) {
    if (!wallet.is_frozen) {
      setFreezeTarget(wallet);
      setFreezeReason('');
      return;
    }
    await runAction(
      () =>
        requestJson(`/api/admin/wallets/${wallet.user_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ frozen: false }),
        }),
      'Wallet unfrozen'
    );
  }

  async function confirmFreeze() {
    if (!freezeTarget) return;
    await runAction(
      () =>
        requestJson(`/api/admin/wallets/${freezeTarget.user_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ frozen: true, reason: freezeReason }),
        }),
      'Wallet frozen'
    );
    setFreezeTarget(null);
    setFreezeReason('');
  }

  async function createMerchant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      () =>
        requestJson('/api/admin/merchants', {
          method: 'POST',
          body: JSON.stringify({
            userId: merchantUserId,
            businessName,
            businessType,
          }),
        }),
      'Merchant profile created'
    );
    setMerchantUserId('');
    setBusinessName('');
    setBusinessType('other');
  }

  async function setMerchantStatus(merchant: MerchantRecord, status: MerchantRecord['status']) {
    await runAction(
      () =>
        requestJson(`/api/admin/merchants/${merchant.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
      `Merchant marked ${status}`
    );
  }

  async function saveSetting(key: keyof Overview['settings'], value: string | boolean) {
    await runAction(
      () =>
        requestJson('/api/admin/settings', {
          method: 'PATCH',
          body: JSON.stringify({ key, value }),
        }),
      'Platform setting saved'
    );
  }

  const content = (() => {
    if (!overview) return null;
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Registered users"
                value={overview.user_count.toLocaleString()}
                icon={Users}
              />
              <Metric
                label="PHP ledger balance"
                value={php.format(Number(overview.wallet_balance_php))}
                icon={Wallet}
              />
              <Metric
                label="Pending deposits"
                value={overview.pending_deposit_count.toLocaleString()}
                icon={CreditCard}
              />
              <Metric
                label="Active merchants"
                value={`${overview.active_merchant_count} / ${overview.merchant_count}`}
                icon={Building2}
              />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="admin-panel">
                <SectionHeading
                  title="Deposit review queue"
                  detail="Latest Swiftpay payment intents. Final status is set by signed provider notifications."
                />
                <DepositTable rows={overview.deposits.slice(0, 6)} />
              </section>
              <section className="admin-panel">
                <SectionHeading
                  title="Recent administrative actions"
                  detail="Changes are recorded with the acting administrator."
                />
                <AuditTable rows={overview.audit_log.slice(0, 6)} />
              </section>
            </div>
          </div>
        );
      case 'users':
        return (
          <section className="admin-panel">
            <SectionHeading
              title="Account access"
              detail={`Showing page ${userPage}${totalUsers === null ? '' : ` of ${Math.max(1, Math.ceil(totalUsers / 50))}`} · Suspended accounts cannot sign in.`}
            />
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name || user.email || user.id}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email} · Joined {displayDate(user.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setUserSuspended(user)}
                    className={user.bannedUntil ? 'admin-button-secondary' : 'admin-button-danger'}
                  >
                    {user.bannedUntil ? 'Restore access' : 'Suspend access'}
                  </button>
                </div>
              ))}
              {!users.length && <EmptyState>No accounts are available on this page.</EmptyState>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                className="admin-button-secondary"
                disabled={userPage <= 1 || busy}
                onClick={() => setUserPage((page) => page - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-xs text-muted-foreground">
                {totalUsers ?? users.length} accounts
              </span>
              <button
                type="button"
                className="admin-button-secondary"
                disabled={users.length < 50 || busy}
                onClick={() => setUserPage((page) => page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </section>
        );
      case 'wallets':
        return (
          <section className="admin-panel">
            <SectionHeading
              title="PHP wallets"
              detail={`Latest ${overview.wallets.length} accounts. Freezing blocks new deposit checkout; existing provider payments still settle normally. No balances can be edited here.`}
            />
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Balance</th>
                    <th>Status / reason</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.wallets.map((wallet) => (
                    <tr key={wallet.user_id}>
                      <td>
                        <div className="font-medium text-foreground">
                          {wallet.email || wallet.user_id}
                        </div>
                        <div className="text-xs text-muted-foreground">{wallet.user_id}</div>
                      </td>
                      <td>{php.format(Number(wallet.balance_php))}</td>
                      <td>
                        <StatusPill value={wallet.is_frozen ? 'Frozen' : 'Active'} />
                        {wallet.freeze_reason && (
                          <p className="mt-1 max-w-56 text-xs text-muted-foreground">
                            {wallet.freeze_reason}
                          </p>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleWallet(wallet)}
                          className={
                            wallet.is_frozen ? 'admin-button-secondary' : 'admin-button-danger'
                          }
                        >
                          {wallet.is_frozen ? 'Unfreeze' : 'Freeze wallet'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!overview.wallets.length && <EmptyState>No user wallets found.</EmptyState>}
            </div>
          </section>
        );
      case 'merchants':
        return (
          <div className="space-y-5">
            <section className="admin-panel">
              <SectionHeading
                title="Register a merchant"
                detail="Link a business profile to an existing SwiftWallet account."
              />
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={(event) => void createMerchant(event)}
              >
                <select
                  required
                  className="admin-input md:col-span-1"
                  value={merchantUserId}
                  onChange={(event) => setMerchantUserId(event.target.value)}
                >
                  <option value="">Select account</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email || user.id}
                    </option>
                  ))}
                </select>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  className="admin-input"
                  placeholder="Business name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
                <select
                  className="admin-input"
                  value={businessType}
                  onChange={(event) => setBusinessType(event.target.value)}
                >
                  <option value="retail">Retail</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || !merchantUserId}
                  className="admin-button-primary"
                >
                  Add merchant
                </button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Account selector uses the current user page. Move through user pages to select
                another account.
              </p>
            </section>
            <section className="admin-panel">
              <SectionHeading
                title="Merchant accounts"
                detail="Review, activate, or suspend merchant profiles."
              />
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Owner</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Change status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.merchants.map((merchant) => (
                      <tr key={merchant.id}>
                        <td className="font-medium text-foreground">{merchant.business_name}</td>
                        <td>{merchant.email}</td>
                        <td className="capitalize">{merchant.business_type}</td>
                        <td>
                          <StatusPill value={merchant.status} />
                        </td>
                        <td>
                          <select
                            aria-label={`Set ${merchant.business_name} status`}
                            className="admin-input min-w-32"
                            value={merchant.status}
                            disabled={busy}
                            onChange={(event) =>
                              void setMerchantStatus(
                                merchant,
                                event.target.value as MerchantRecord['status']
                              )
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!overview.merchants.length && (
                  <EmptyState>No merchant profiles have been registered.</EmptyState>
                )}
              </div>
            </section>
          </div>
        );
      case 'payments':
        return (
          <div className="space-y-5">
            <section className="admin-panel">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  title="Swiftpay deposits"
                  detail="Read-only payment review. Payment statuses and wallet credits come only from verified Swiftpay notifications."
                />
                <select
                  className="admin-input w-40"
                  value={depositFilter}
                  onChange={(event) =>
                    setDepositFilter(event.target.value as 'ALL' | PaymentStatus)
                  }
                >
                  <option value="ALL">All statuses</option>
                  {(
                    [
                      'PENDING',
                      'PAID',
                      'REJECTED',
                      'CANCELED',
                      'EXPIRED',
                      'FAILED',
                    ] as PaymentStatus[]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <DepositTable rows={visibleDeposits} />
            </section>
            <section className="admin-panel">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
                <p>
                  <span className="font-medium text-foreground">
                    Withdrawals are not connected to a processing service.
                  </span>{' '}
                  Existing withdrawal screens are demo-only and do not create persisted requests,
                  debit wallets, or initiate payouts, so there is no withdrawal queue to review.
                </p>
              </div>
            </section>
          </div>
        );
      case 'settings':
        return (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="admin-panel space-y-5">
              <SectionHeading
                title="Platform identity"
                detail="Update the public platform label and customer support contact."
              />
              <SettingText
                label="Platform name"
                value={overview.settings.platform_name ?? 'SwiftWallet'}
                onSave={(value) => saveSetting('platform_name', value)}
                disabled={busy}
              />
              <SettingText
                label="Support email"
                value={overview.settings.support_email ?? ''}
                onSave={(value) => saveSetting('support_email', value)}
                disabled={busy}
                type="email"
              />
            </section>
            <section className="admin-panel">
              <SectionHeading
                title="Collection controls"
                detail="Switching off deposits prevents new Swiftpay checkouts; existing payments can still settle."
              />
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <p className="font-medium text-foreground">PHP deposits</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overview.settings.deposits_enabled === false
                      ? 'New checkouts are disabled.'
                      : 'New checkouts are enabled.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={overview.settings.deposits_enabled !== false}
                  disabled={busy}
                  onClick={() =>
                    void saveSetting(
                      'deposits_enabled',
                      overview.settings.deposits_enabled === false
                    )
                  }
                  className={`relative h-7 w-12 rounded-full transition-colors ${overview.settings.deposits_enabled === false ? 'bg-muted' : 'bg-primary'}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${overview.settings.deposits_enabled === false ? 'left-1' : 'left-6'}`}
                  />
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-muted-foreground">
                <AlertTriangle size={17} className="mb-2 text-warning" />
                This console does not edit balances, initiate payouts, or override payment-provider
                results.
              </div>
            </section>
          </div>
        );
      case 'audit':
        return (
          <section className="admin-panel">
            <SectionHeading
              title="Administrator audit trail"
              detail="Most recent 100 tracked changes and the acting administrator."
            />
            <AuditTable rows={overview.audit_log} />
          </section>
        );
    }
  })();

  return (
    <AppLayout activeRoute="/admin">
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 lg:px-8 xl:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                {overview?.settings.platform_name || 'SwiftWallet'} Admin console
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform operations, access controls, and payment oversight.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="admin-button-secondary"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>

        <nav
          aria-label="Administration sections"
          className="flex gap-2 overflow-x-auto border-b border-border pb-2"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${activeTab === id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {error ? (
          <div className="admin-panel flex items-center gap-3 text-sm text-danger" role="alert">
            <AlertTriangle size={18} />
            {error}
            {error.toLowerCase().includes('administrator') && (
              <span> Ask a project administrator to grant your account access in Supabase.</span>
            )}
          </div>
        ) : loading && !overview ? (
          <div className="admin-panel flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle size={18} className="animate-spin" />
            Loading administration data…
          </div>
        ) : (
          content
        )}

        {freezeTarget && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setFreezeTarget(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="freeze-heading"
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <LockKeyhole size={18} className="text-danger" />
                <h2 id="freeze-heading" className="font-semibold text-foreground">
                  Freeze PHP wallet
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {freezeTarget.email || freezeTarget.user_id}. New deposit checkouts will be blocked.
                Existing Swiftpay payments can still settle.
              </p>
              <label
                className="mt-4 block text-sm font-medium text-foreground"
                htmlFor="freeze-reason"
              >
                Reason (required)
              </label>
              <textarea
                id="freeze-reason"
                minLength={3}
                maxLength={500}
                required
                className="admin-input mt-2 min-h-24 w-full"
                value={freezeReason}
                onChange={(event) => setFreezeReason(event.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="admin-button-secondary"
                  onClick={() => setFreezeTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-button-danger"
                  disabled={busy || freezeReason.trim().length < 3}
                  onClick={() => void confirmFreeze()}
                >
                  <LockKeyhole size={15} />
                  Freeze wallet
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="admin-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon size={17} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function StatusPill({ value }: { value: string }) {
  const positive = ['PAID', 'active', 'Active'].includes(value);
  const negative = ['FAILED', 'REJECTED', 'SUSPENDED', 'suspended', 'Frozen'].includes(value);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${positive ? 'bg-accent/15 text-accent' : negative ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}
    >
      {value}
    </span>
  );
}

function DepositTable({ rows }: { rows: DepositRecord[] }) {
  if (!rows.length) return <EmptyState>No matching deposits.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-mono text-xs text-foreground">{row.reference_no}</td>
              <td>{row.email}</td>
              <td>{php.format(Number(row.amount))}</td>
              <td>
                <StatusPill value={row.status} />
              </td>
              <td>{displayDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows }: { rows: AuditRecord[] }) {
  if (!rows.length) return <EmptyState>No administrative actions have been logged yet.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Administrator</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{displayDate(row.created_at)}</td>
              <td>{row.actor_email}</td>
              <td className="font-medium text-foreground">{row.action}</td>
              <td>
                {row.target_type} · <span className="font-mono text-xs">{row.target_id}</span>
              </td>
              <td className="max-w-56 truncate text-xs" title={JSON.stringify(row.details)}>
                {JSON.stringify(row.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingText({
  label,
  value,
  onSave,
  disabled,
  type = 'text',
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  disabled: boolean;
  type?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const changed = draft !== value;
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(draft);
      }}
    >
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        <input
          type={type}
          maxLength={type === 'email' ? 254 : 80}
          required={type === 'email' ? false : true}
          className="admin-input min-w-0 flex-1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={disabled || !changed} className="admin-button-primary">
          <Check size={15} />
          Save
        </button>
      </div>
    </form>
  );
}
