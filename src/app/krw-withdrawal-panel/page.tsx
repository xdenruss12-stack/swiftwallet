'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import AppLayout from '@/components/AppLayout';
import KrwBankTabs from './components/KrwBankTabs';
import KrwFeeTable from './components/KrwFeeTable';
import StripeWithdrawalForm from './components/StripeWithdrawalForm';
import OtpInput from '../withdrawal-flow/components/OtpInput';
import { WALLET_BALANCES, USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';
import { getStripe } from '@/lib/stripe/client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  Mail,
  RotateCcw,
  ExternalLink,
  WalletCards,
  CreditCard,
  Building2,
} from 'lucide-react';
import { getBankById } from '@/lib/banks';
import BankLogo from '@/components/ui/BankLogo';
import DepositStepIndicator from '../deposit-wizard/components/DepositStepIndicator';

const BANK_STEPS = ['Amount & Account', 'OTP Verification'];
const STRIPE_STEPS = ['Amount & Account', 'Card Payment'];
const OTP_TIMEOUT = 120;

type PaymentMethod = 'bank' | 'stripe';

interface KrwWithdrawForm {
  amount: string;
}

export default function KrwWithdrawalPanelPage() {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(OTP_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<KrwWithdrawForm>({ defaultValues: { amount: '' } });
  const amountVal = watch('amount');
  const krwWallet = WALLET_BALANCES.find((b) => b.currency === 'KRW')!;

  const STEPS = paymentMethod === 'stripe' ? STRIPE_STEPS : BANK_STEPS;

  useEffect(() => {
    if (step === 2 && paymentMethod === 'bank') {
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
  }, [step, paymentMethod]);

  function onAmountSubmit(data: KrwWithdrawForm) {
    if (paymentMethod === 'bank' && !selectedAcct) {
      toast.error('Select a destination bank account');
      return;
    }
    const amt = parseFloat(data.amount);
    const fee = paymentMethod === 'stripe'
      ? Math.round(amt * 0.029) + 350
      : 500 + (amt > 1000000 ? 1000 : 0);
    if (amt + fee > krwWallet.balance) {
      toast.error(`Insufficient KRW balance (including ${paymentMethod === 'stripe' ? 'Stripe' : '₩500'} fee)`);
      return;
    }
    setStep(2);
    if (paymentMethod === 'bank') {
      toast.info('OTP sent to m***@gmail.com');
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setIsVerifying(true);
    setOtpError('');
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
    toast.info('New OTP sent to your email');
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleStripeSuccess(paymentIntentId: string) {
    setStripePaymentIntentId(paymentIntentId);
    setIsSuccess(true);
    toast.success('Card payment successful! KRW withdrawal is being processed.');
  }

  function handleReset() {
    setStep(1);
    setIsSuccess(false);
    setOtp(Array(6).fill(''));
    setSelectedAcct(null);
    setStripePaymentIntentId(null);
    setOtpError('');
  }

  const selectedAcctData = USER_BANK_ACCOUNTS.find((a) => a.id === selectedAcct);
  const selectedBank = selectedAcctData ? getBankById(selectedAcctData.bankId, 'KRW') : null;
  const isToss = selectedAcctData?.bankId === 'toss';
  const amt = parseFloat(amountVal || '0');
  const stripeFee = amt > 0 ? Math.round(amt * 0.029) + 350 : 0;

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
              <span className="text-foreground font-semibold">{fmtCurrency(amt, 'KRW')}</span> is being processed
              {paymentMethod === 'stripe' ? ' via Stripe card payment' : ' to your account'}.
            </p>

            {paymentMethod === 'stripe' && stripePaymentIntentId && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl text-left">
                <CreditCard size={16} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Stripe Payment Confirmed</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{stripePaymentIntentId}</p>
                </div>
              </div>
            )}

            {paymentMethod === 'bank' && selectedBank && selectedAcctData && (
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
                <span className="text-muted-foreground">
                  {paymentMethod === 'stripe' ? 'Stripe Fee (2.9% + ₩350)' : 'Transfer Fee'}
                </span>
                <span className="font-tabular text-danger">
                  -{paymentMethod === 'stripe' ? fmtCurrency(stripeFee, 'KRW') : '₩500'}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold text-foreground">Total Deducted</span>
                <span className="font-tabular font-bold text-danger">
                  {fmtCurrency(amt + (paymentMethod === 'stripe' ? stripeFee : 500), 'KRW')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Time</span>
                <span className="text-foreground">
                  {paymentMethod === 'stripe' ? '1–2 business days' : 'Same day / Next business day'}
                </span>
              </div>
            </div>

            {paymentMethod === 'bank' && isToss && (
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all">
                <ExternalLink size={14} />
                Open Toss to Track Transfer
              </button>
            )}

            <button
              onClick={handleReset}
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
              <h1 className="text-base sm:text-2xl font-semibold text-foreground">KRW Withdrawal</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Transfer Korean Won to Toss or traditional bank</p>
            </div>
            <div className="card-elevated p-3 rounded-xl flex items-center gap-3 w-full sm:w-auto sm:min-w-[220px]">
              <div className="w-9 h-9 rounded-xl bg-krw/20 border border-krw/30 flex items-center justify-center flex-shrink-0">
                <WalletCards size={18} className="text-krw" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">KRW Balance</p>
                <p className="text-base sm:text-lg font-bold font-tabular text-krw truncate">{fmtCurrency(krwWallet.balance, 'KRW')}</p>
                {krwWallet.pendingOut > 0 && (
                  <p className="text-xs text-warning">-{fmtCurrency(krwWallet.pendingOut, 'KRW')} pending</p>
                )}
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <DepositStepIndicator currentStep={step} steps={STEPS} />

          {/* Step 1: Amount + Bank + Payment Method */}
          {step === 1 && (
            <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-4 sm:space-y-5">

              {/* Payment Method Selector */}
              <div className="card-surface p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Payment Method</h2>
                <div className="grid grid-cols-2 gap-2">
                  {/* Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-150 min-h-[88px] ${
                      paymentMethod === 'bank' ?'border-primary bg-primary/10 text-primary' :'border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <Building2 size={20} />
                    <div className="text-center">
                      <p className="text-xs font-semibold">Bank Transfer</p>
                      <p className="text-[10px] mt-0.5 opacity-75">₩500 flat fee</p>
                    </div>
                    {paymentMethod === 'bank' && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Selected</span>
                    )}
                  </button>

                  {/* Stripe Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-150 min-h-[88px] ${
                      paymentMethod === 'stripe' ?'border-primary bg-primary/10 text-primary' :'border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <CreditCard size={20} />
                    <div className="text-center">
                      <p className="text-xs font-semibold">Stripe Card</p>
                      <p className="text-[10px] mt-0.5 opacity-75">2.9% + ₩350</p>
                    </div>
                    {paymentMethod === 'stripe' && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Selected</span>
                    )}
                  </button>
                </div>

                {paymentMethod === 'stripe' && (
                  <div className="mt-3 flex items-start gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <CreditCard size={12} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-primary/80">
                      Stripe fees are charged directly to your card. No bank account required for this method.
                    </p>
                  </div>
                )}
              </div>

              {/* Bank Account Selector — only for bank transfer */}
              {paymentMethod === 'bank' && (
                <div className="card-surface p-4 sm:p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Destination Account</h2>
                  <KrwBankTabs selectedAcctId={selectedAcct} onSelect={setSelectedAcct} />
                </div>
              )}

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
                          const fee = paymentMethod === 'stripe'
                            ? Math.round(n * 0.029) + 350
                            : 500 + (n > 1000000 ? 1000 : 0);
                          if (n + fee > krwWallet.balance) return 'Insufficient balance (including fees)';
                          return true;
                        },
                      })}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3.5 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
                      className="px-3 py-2 text-xs font-medium bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all min-h-[36px]"
                    >
                      ₩{(preset / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>

                {/* Fee Table */}
                {amt > 0 && !isNaN(amt) && (
                  <KrwFeeTable amount={amt} paymentMethod={paymentMethod} />
                )}
              </div>

              {/* Notices */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                  <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    {paymentMethod === 'stripe' ?'Stripe card charges are instant. KRW will be credited to your wallet and processed within 1–2 business days.' :'Withdrawals submitted after 15:00 KST will be processed the next business day. Korean public holidays may cause delays.'}
                  </p>
                </div>
                {paymentMethod === 'bank' && isToss && selectedBank && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{ backgroundColor: selectedBank.color, color: selectedBank.textColor }}>
                      TB
                    </div>
                    <p className="text-xs text-primary">Toss transfers are typically instant during business hours.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-krw text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 min-h-[48px]"
              >
                {paymentMethod === 'stripe' ? 'Continue to Card Payment' : 'Request KRW Withdrawal'}
              </button>
            </form>
          )}

          {/* Step 2: OTP (bank) */}
          {step === 2 && paymentMethod === 'bank' && (
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
                  <button onClick={handleResendOtp} className="flex items-center gap-1.5 mx-auto text-primary hover:text-primary/80 transition-colors py-2">
                    <RotateCcw size={12} /> Resend OTP
                  </button>
                ) : (
                  <span>Resend in <span className="font-semibold text-foreground font-tabular">{otpTimer}s</span></span>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => { setStep(1); setOtp(Array(6).fill('')); setOtpError(''); }}
                  className="flex-1 py-3.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all min-h-[48px]"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otp.join('').length < 6}
                  className="flex-1 py-3.5 rounded-xl bg-krw text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {isVerifying ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                  ) : 'Confirm Withdrawal'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Stripe Card Payment */}
          {step === 2 && paymentMethod === 'stripe' && (
            <Elements stripe={getStripe()}>
              <StripeWithdrawalForm
                amount={amt}
                stripeFee={stripeFee}
                onSuccess={handleStripeSuccess}
                onBack={() => setStep(1)}
              />
            </Elements>
          )}
        </div>
      </div>
    </AppLayout>
  );
}