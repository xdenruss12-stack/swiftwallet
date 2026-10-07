'use client';
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import KrwBankTabs from './components/KrwBankTabs';
import KrwFeeTable from './components/KrwFeeTable';
import OtpInput from '../withdrawal-flow/components/OtpInput';
import { WALLET_BALANCES, USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  Mail,
  RotateCcw,
  ExternalLink,
  WalletCards,
} from 'lucide-react';
import { getBankById } from '@/lib/banks';
import BankLogo from '@/components/ui/BankLogo';
import DepositStepIndicator from '../deposit-wizard/components/DepositStepIndicator';

const STEPS = ['Amount & Account', 'OTP Verification'];
const OTP_TIMEOUT = 120;

interface KrwWithdrawForm {
  amount: string;
}

export default function KrwWithdrawalPanelPage() {
  const [step, setStep] = useState(1);
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [otpTimer, setOtpTimer] = useState(OTP_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<KrwWithdrawForm>({ defaultValues: { amount: '' } });
  const amountVal = watch('amount');
  const krwWallet = WALLET_BALANCES.find((b) => b.currency === 'KRW')!;

  useEffect(() => {
    if (step === 2) {
      setOtpTimer(OTP_TIMEOUT);
      setCanResend(false);
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  function onAmountSubmit(data: KrwWithdrawForm) {
    if (!selectedAcct) { toast.error('Select a destination bank account'); return; }
    const amt = parseFloat(data.amount);
    if (amt + 500 > krwWallet.balance) { toast.error('Insufficient KRW balance (including ₩500 fee)'); return; }
    setStep(2);
    // Backend integration: POST /api/wallet/krw-withdrawal/init → triggers OTP email
    toast.info('OTP sent to m***@gmail.com');
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setIsVerifying(true);
    setOtpError('');
    // Backend integration: POST /api/wallet/krw-withdrawal/verify-otp
    await new Promise((r) => setTimeout(r, 2000));
    if (code === '123456') {
      setIsVerifying(false);
      setIsSuccess(true);
      toast.success('KRW withdrawal approved! Funds will arrive within 1 business day.');
    } else {
      setIsVerifying(false);
      setOtpError('Invalid OTP. Check your email and try again — use 123456 for demo.');
    }
  }

  function handleResendOtp() {
    setCanResend(false);
    setOtpTimer(OTP_TIMEOUT);
    setOtp(Array(6).fill(''));
    // Backend integration: POST /api/wallet/krw-withdrawal/resend-otp
    toast.info('New OTP sent to your email');
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const selectedAcctData = USER_BANK_ACCOUNTS.find((a) => a.id === selectedAcct);
  const selectedBank = selectedAcctData ? getBankById(selectedAcctData.bankId, 'KRW') : null;
  const isToss = selectedAcctData?.bankId === 'toss';
  const amt = parseFloat(amountVal || '0');

  if (isSuccess) {
    return (
      <AppLayout activeRoute="/krw-withdrawal-panel">
        <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
          <div className="max-w-md mx-auto text-center py-16 space-y-5 fade-in">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">KRW Withdrawal Approved</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{fmtCurrency(amt, 'KRW')}</span> is being processed to your account.
            </p>

            {selectedBank && selectedAcctData && (
              <div className="flex items-center gap-3 p-3 card-elevated rounded-xl text-left">
                <BankLogo bank={selectedBank} size="md" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedBank.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedAcctData.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">{selectedAcctData.accountName}</p>
                </div>
              </div>
            )}

            <div className="p-3 bg-secondary rounded-xl text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Withdrawn</span>
                <span className="font-tabular text-foreground">{fmtCurrency(amt, 'KRW')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer Fee</span>
                <span className="font-tabular text-danger">-₩500</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold text-foreground">Total Deducted</span>
                <span className="font-tabular font-bold text-danger">{fmtCurrency(amt + 500, 'KRW')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Time</span>
                <span className="text-foreground">Same day / Next business day</span>
              </div>
            </div>

            {isToss && (
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all">
                <ExternalLink size={14} />
                Open Toss to Track Transfer
              </button>
            )}

            <button
              onClick={() => { setStep(1); setIsSuccess(false); setOtp(Array(6).fill('')); setSelectedAcct(null); }}
              className="w-full py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              Make Another Withdrawal
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeRoute="/krw-withdrawal-panel">
      <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground">KRW Withdrawal</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Transfer Korean Won to Toss or traditional bank</p>
            </div>
            <div className="card-elevated p-3 sm:p-4 rounded-xl flex items-center gap-3 w-full sm:w-auto sm:min-w-[220px]">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-krw/20 border border-krw/30 flex items-center justify-center flex-shrink-0">
                <WalletCards size={18} className="text-krw" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">KRW Balance</p>
                <p className="text-base sm:text-lg font-bold font-tabular text-krw">{fmtCurrency(krwWallet.balance, 'KRW')}</p>
                {krwWallet.pendingOut > 0 && (
                  <p className="text-xs text-warning">-{fmtCurrency(krwWallet.pendingOut, 'KRW')} pending</p>
                )}
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <DepositStepIndicator currentStep={step} steps={STEPS} />

          {/* Step 1: Amount + Bank */}
          {step === 1 && (
            <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-4 sm:space-y-5">
              {/* Bank Account Selector */}
              <div className="card-surface p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Destination Account</h2>
                <KrwBankTabs selectedAcctId={selectedAcct} onSelect={setSelectedAcct} />
              </div>

              {/* Amount Input */}
              <div className="card-surface p-4 sm:p-5 space-y-3 sm:space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Withdrawal Amount</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Amount (KRW)</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Min: ₩10,000 · Max: ₩5,000,000 · Available: {fmtCurrency(krwWallet.balance, 'KRW')}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₩</span>
                    <input
                      {...register('amount', {
                        required: 'Amount is required',
                        validate: (v) => {
                          const n = parseFloat(v);
                          if (isNaN(n) || n <= 0) return 'Enter a valid amount';
                          if (n < 10000) return 'Minimum withdrawal is ₩10,000';
                          if (n > 5000000) return 'Maximum withdrawal is ₩5,000,000';
                          if (n + 500 > krwWallet.balance) return 'Insufficient balance (including ₩500 fee)';
                          return true;
                        },
                      })}
                      type="number"
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-danger mt-1.5">{errors.amount.message}</p>}
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[50000, 100000, 300000, 500000].map((preset) => (
                    <button
                      key={`preset-${preset}`}
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                        if (input) { input.value = String(preset); input.dispatchEvent(new Event('input', { bubbles: true })); }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                    >
                      ₩{(preset / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>

                {/* Fee Table */}
                {amt > 0 && !isNaN(amt) && (
                  <KrwFeeTable amount={amt} />
                )}
              </div>

              {/* Notices */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                  <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    Withdrawals submitted after 15:00 KST will be processed the next business day. Korean public holidays may cause delays.
                  </p>
                </div>
                {isToss && selectedBank && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor }}>
                      TB
                    </div>
                    <p className="text-xs text-primary">Toss transfers are typically instant during business hours.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-krw text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150"
              >
                Request KRW Withdrawal
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="card-surface p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-krw/15 border border-krw/30 flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-krw" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Email Verification Required</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A 6-digit code was sent to <span className="text-foreground font-medium">m***@gmail.com</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Demo OTP: <span className="font-mono text-warning font-semibold">123456</span>
                </p>
              </div>

              {/* Withdrawal Summary */}
              {selectedBank && selectedAcctData && (
                <div className="flex items-center gap-3 p-3 card-elevated rounded-xl">
                  <BankLogo bank={selectedBank} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedBank.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedAcctData.accountNumber}</p>
                  </div>
                  <p className="text-sm font-bold font-tabular text-krw flex-shrink-0">{fmtCurrency(amt, 'KRW')}</p>
                </div>
              )}

              <OtpInput value={otp} onChange={setOtp} disabled={isVerifying} />

              {otpError && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl">
                  <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                  <p className="text-xs text-danger">{otpError}</p>
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground">
                {canResend ? (
                  <button onClick={handleResendOtp} className="flex items-center gap-1.5 mx-auto text-primary hover:text-primary/80 transition-colors">
                    <RotateCcw size={12} /> Resend OTP
                  </button>
                ) : (
                  <span>Resend in <span className="font-semibold text-foreground font-tabular">{otpTimer}s</span></span>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => { setStep(1); setOtp(Array(6).fill('')); setOtpError(''); }}
                  className="flex-1 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otp.join('').length < 6}
                  className="flex-1 py-3 rounded-xl bg-krw text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                  ) : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}