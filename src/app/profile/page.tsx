'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import BankLogo from '@/components/ui/BankLogo';
import { getBankById } from '@/lib/banks';
import { USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
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
  X,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Smartphone,
  Copy,
  Check,
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
      className="w-full flex items-center gap-3 px-3 sm:px-4 py-3.5 hover:bg-secondary/60 transition-colors rounded-xl text-left min-h-[56px]"
    >
      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>}
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

const CURRENCIES = [
  { code: 'PHP', label: 'Philippine Peso (PHP)' },
  { code: 'KRW', label: 'Korean Won (KRW)' },
  { code: 'USDT', label: 'Tether (USDT)' },
  { code: 'USD', label: 'US Dollar (USD)' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'fil', label: 'Filipino' },
  { code: 'zh', label: '中文 (Chinese)' },
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  preferred_currency: string;
  preferred_language: string;
  totp_enabled: boolean;
  created_at: string;
}

type ModalType = 'password' | 'edit-profile' | 'preferences' | '2fa-setup' | '2fa-disable' | null;

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Preferences state
  const [prefCurrency, setPrefCurrency] = useState('PHP');
  const [prefLanguage, setPrefLanguage] = useState('en');
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefError, setPrefError] = useState('');

  // 2FA state
  const [totpUri, setTotpUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  const phpAccounts = USER_BANK_ACCOUNTS.filter((a) => a.currency === 'PHP');
  const krwAccounts = USER_BANK_ACCOUNTS.filter((a) => a.currency === 'KRW');

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.log('Profile fetch error:', error.message);
      } else if (data) {
        setProfile(data as UserProfile);
        setPrefCurrency(data.preferred_currency || 'PHP');
        setPrefLanguage(data.preferred_language || 'en');
      }
    } catch (err: any) {
      console.log('Profile fetch failed:', err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const closeModal = () => {
    setActiveModal(null);
    setPasswordError('');
    setEditError('');
    setPrefError('');
    setTotpError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTotpCode('');
    setTotpUri('');
    setTotpSecret('');
  };

  // ── Change Password ──────────────────────────────────────────
  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError('Current password is incorrect.');
        setPasswordLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        closeModal();
        showSuccess('Password updated successfully.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Edit Profile ─────────────────────────────────────────────
  const openEditProfile = () => {
    setEditName(profile?.full_name || user?.user_metadata?.full_name || '');
    setEditPhone(profile?.phone || '');
    setActiveModal('edit-profile');
  };

  const handleSaveProfile = async () => {
    setEditError('');
    if (!editName.trim()) {
      setEditError('Full name is required.');
      return;
    }
    setEditLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() },
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('user_profiles')
        .update({ full_name: editName.trim(), phone: editPhone.trim() })
        .eq('id', user?.id);
      if (dbError) throw dbError;

      await fetchProfile();
      closeModal();
      showSuccess('Profile updated successfully.');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Preferences ──────────────────────────────────────────────
  const handleSavePreferences = async () => {
    setPrefError('');
    setPrefLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ preferred_currency: prefCurrency, preferred_language: prefLanguage })
        .eq('id', user?.id);
      if (error) throw error;
      await fetchProfile();
      closeModal();
      showSuccess('Preferences saved.');
    } catch (err: any) {
      setPrefError(err.message || 'Failed to save preferences.');
    } finally {
      setPrefLoading(false);
    }
  };

  // ── 2FA Setup ────────────────────────────────────────────────
  const handleOpen2FASetup = async () => {
    setTotpLoading(true);
    setTotpError('');
    setActiveModal('2fa-setup');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) {
        setTotpError(error.message);
      } else {
        setTotpUri(data?.totp?.qr_code || '');
        setTotpSecret(data?.totp?.secret || '');
      }
    } catch (err: any) {
      setTotpError(err.message || 'Failed to start 2FA setup.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setTotpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setTotpLoading(true);
    setTotpError('');
    try {
      // Challenge then verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: (await supabase.auth.mfa.listFactors()).data?.totp?.[0]?.id || '',
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: (await supabase.auth.mfa.listFactors()).data?.totp?.[0]?.id || '',
        challengeId: challengeData?.id || '',
        code: totpCode,
      });
      if (verifyError) {
        setTotpError('Invalid code. Please try again.');
      } else {
        // Mark totp_enabled in profile
        await supabase
          .from('user_profiles')
          .update({ totp_enabled: true })
          .eq('id', user?.id);
        await fetchProfile();
        closeModal();
        showSuccess('Two-factor authentication enabled.');
      }
    } catch (err: any) {
      setTotpError(err.message || 'Verification failed.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTotpLoading(true);
    setTotpError('');
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw error;
      }
      await supabase
        .from('user_profiles')
        .update({ totp_enabled: false, totp_secret: '' })
        .eq('id', user?.id);
      await fetchProfile();
      closeModal();
      showSuccess('Two-factor authentication disabled.');
    } catch (err: any) {
      setTotpError(err.message || 'Failed to disable 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  const copySecret = () => {
    if (totpSecret) {
      navigator.clipboard.writeText(totpSecret).catch(() => {});
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const displayPhone = profile?.phone || '';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <AppLayout activeRoute="/profile">
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-base sm:text-xl font-semibold text-foreground">My Profile</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Account details, KYC status, and settings</p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/25 text-accent text-sm font-medium">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span className="flex-1 min-w-0">{successMsg}</span>
          </div>
        )}

        {/* Account Card */}
        <div className="card-surface p-4 sm:p-5">
          {profileLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-secondary rounded w-40" />
                <div className="h-3 bg-secondary rounded w-28" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-primary">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-card flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{displayName}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 flex-shrink-0">
                    Verified
                  </span>
                </div>
                {memberSince && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Member since {memberSince}</p>
                )}
              </div>
              <button
                onClick={openEditProfile}
                className="flex-shrink-0 p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}

          {/* Personal Info */}
          <div className="mt-4 sm:mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {[
              { icon: <Mail size={14} />, label: 'Email', value: displayEmail || '—' },
              { icon: <Phone size={14} />, label: 'Phone', value: displayPhone || 'Not set' },
              { icon: <MapPin size={14} />, label: 'Country', value: 'Philippines / South Korea' },
              { icon: <Globe size={14} />, label: 'Account ID', value: user?.id?.slice(0, 12).toUpperCase() || '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-2.5 sm:p-3 bg-secondary rounded-xl">
                <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KYC Status */}
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-primary" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground">KYC Verification</h3>
          </div>
          <div className="space-y-3">
            {KYC_TIERS.map((tier) => {
              const isCompleted = tier.status === 'completed';
              const isPending = tier.status === 'pending';
              return (
                <div
                  key={tier.tier}
                  className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-accent/5 border-accent/20'
                      : isPending
                      ? 'bg-warning/5 border-warning/20' :'bg-secondary border-border'
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-accent/15 text-accent' : isPending ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={16} /> : isPending ? <Clock size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tier.tier}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isCompleted ? 'bg-accent/15 text-accent' : isPending ? 'bg-warning/15 text-warning' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {isCompleted ? 'Completed' : isPending ? 'Pending' : 'Locked'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                    {/* Mobile: show limits inline */}
                    <div className="flex gap-3 mt-1 sm:hidden">
                      <span className="text-xs text-muted-foreground">↑ {fmtCurrency(tier.depositLimit, tier.currency as 'PHP')}</span>
                      <span className="text-xs text-muted-foreground">↓ {fmtCurrency(tier.withdrawLimit, tier.currency as 'PHP')}</span>
                    </div>
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
                    <button className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-warning/15 text-warning border border-warning/25 hover:bg-warning/25 transition-colors min-h-[32px]">
                      Verify
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Limits */}
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <CreditCard size={18} className="text-primary" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Transaction Limits</h3>
            <span className="ml-auto text-xs text-muted-foreground">Resets daily at 00:00 UTC</span>
          </div>
          <div className="space-y-4">
            {TX_LIMITS.map((limit) => {
              const pct = Math.min((limit.used / limit.max) * 100, 100);
              const isHigh = pct > 80;
              return (
                <div key={limit.label}>
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <span className="text-xs sm:text-sm text-foreground">{limit.label}</span>
                    <span className="text-xs font-tabular text-muted-foreground text-right flex-shrink-0">
                      {fmtCurrency(limit.used, limit.currency)} / {fmtCurrency(limit.max, limit.currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: isHigh ? 'var(--warning)' : limit.color }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% used</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked Bank Accounts */}
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-primary" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Linked Bank Accounts</h3>
          </div>
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
          <div className="flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-border">
            <User size={18} className="text-primary" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground">Account Settings</h3>
          </div>

          {/* Notifications */}
          <div className="px-4 sm:px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Notifications</p>
            <div className="space-y-1">
              {[
                { label: 'Email Notifications', desc: 'Transaction alerts & updates', value: notifEmail, set: setNotifEmail },
                { label: 'SMS Notifications', desc: 'OTP & security alerts', value: notifSms, set: setNotifSms },
                { label: 'Push Notifications', desc: 'Real-time app alerts', value: notifPush, set: setNotifPush },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl hover:bg-secondary/60 transition-colors min-h-[56px]">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 text-muted-foreground">
                    <Bell size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
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

          {/* Preferences */}
          <div className="px-4 sm:px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Preferences</p>
            <div className="space-y-1">
              <SettingRow
                icon={<Globe size={16} />}
                label="Currency & Language"
                description={`${profile?.preferred_currency || 'PHP'} · ${LANGUAGES.find((l) => l.code === (profile?.preferred_language || 'en'))?.label || 'English'}`}
                onClick={() => setActiveModal('preferences')}
              />
            </div>
          </div>

          {/* Security */}
          <div className="px-4 sm:px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Security</p>
            <div className="space-y-1">
              <SettingRow
                icon={<Lock size={16} />}
                label="Change Password"
                description="Update your account password"
                onClick={() => setActiveModal('password')}
              />
              <SettingRow
                icon={<Shield size={16} />}
                label="Two-Factor Authentication"
                description={profile?.totp_enabled ? 'Authenticator app enabled' : 'Add an extra layer of security'}
                action={
                  profile?.totp_enabled ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">On</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Off</span>
                  )
                }
                onClick={() => profile?.totp_enabled ? setActiveModal('2fa-disable') : handleOpen2FASetup()}
              />
              <SettingRow
                icon={<Globe size={16} />}
                label="Active Sessions"
                description="Manage logged-in devices"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL BACKDROP ── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          {/* ── Change Password Modal ── */}
          {activeModal === 'password' && (
            <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Change Password</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {passwordError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                    <AlertCircle size={14} />
                    {passwordError}
                  </div>
                )}
                {/* Current Password */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2.5 pr-10 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {/* New Password */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2.5 pr-10 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2.5 pr-10 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {passwordLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {/* ── Edit Profile Modal ── */}
          {activeModal === 'edit-profile' && (
            <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Edit Profile</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {editError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                    <AlertCircle size={14} />
                    {editError}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={editLoading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Preferences Modal ── */}
          {activeModal === 'preferences' && (
            <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Currency & Language</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {prefError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                    <AlertCircle size={14} />
                    {prefError}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Currency</label>
                  <select
                    value={prefCurrency}
                    onChange={(e) => setPrefCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Language</label>
                  <select
                    value={prefLanguage}
                    onChange={(e) => setPrefLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSavePreferences}
                  disabled={prefLoading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {prefLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {prefLoading ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* ── 2FA Setup Modal ── */}
          {activeModal === '2fa-setup' && (
            <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Set Up 2FA</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {totpError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                    <AlertCircle size={14} />
                    {totpError}
                  </div>
                )}
                {totpLoading && !totpUri ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={28} className="animate-spin text-primary" />
                  </div>
                ) : totpUri ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
                    </p>
                    <div className="flex justify-center p-4 bg-white rounded-xl border border-border">
                      <img src={totpUri} alt="2FA QR Code" width={160} height={160} className="rounded" />
                    </div>
                    {totpSecret && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary rounded-xl border border-border">
                        <code className="flex-1 text-xs font-mono text-foreground break-all">{totpSecret}</code>
                        <button onClick={copySecret} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                          {secretCopied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Verification Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground text-center tracking-widest placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <button
                      onClick={handleVerify2FA}
                      disabled={totpLoading}
                      className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {totpLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                      {totpLoading ? 'Verifying…' : 'Enable 2FA'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* ── 2FA Disable Modal ── */}
          {activeModal === '2fa-disable' && (
            <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-warning" />
                  <h3 className="text-base font-semibold text-foreground">Disable 2FA</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                {totpError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                    <AlertCircle size={14} />
                    {totpError}
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/25 rounded-xl">
                  <AlertCircle size={18} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    Disabling two-factor authentication will make your account less secure. Are you sure you want to continue?
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={totpLoading}
                    className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {totpLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {totpLoading ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
