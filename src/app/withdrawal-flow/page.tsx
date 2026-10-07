'use client';
import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import BankAccountSelector from './components/BankAccountSelector';
import OtpInput from './components/OtpInput';
import DepositStepIndicator from '../deposit-wizard/components/DepositStepIndicator';
import { WALLET_BALANCES } from '@/lib/mockData';
import { fmtCurrency } from '@/lib/currency';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle2, Mail, RotateCcw, AlertTriangle } from 'lucide-react';
import { getBankById } from '@/lib/banks';
import { USER_BANK_ACCOUNTS } from '@/lib/mockData';
import BankLogo from '@/components/ui/BankLogo';

const STEPS = ['Amount & Account', 'OTP Verification'];
const OTP_TIMEOUT = 120;

interface WithdrawForm {
  amount: string;
}

export default function WithdrawalFlowPage() {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState<'PHP' | 'KRW'>('PHP');
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [otpTimer, setOtpTimer] = useState(OTP_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<WithdrawForm>({ defaultValues: { amount: '' } });
  const amountVal = watch('amount');
  const wallet = WALLET_BALANCES.find((b) => b.currency === currency)!;
  const fee = currency === 'KRW' ? 500 : 25;

  useEffect(() => {
    if (step === 2) {
      setOtpTimer(OTP_TIMEOUT);
      setCanResend(false);
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  function onAmountSubmit(data: WithdrawForm) {
    if (!selectedAcct) { toast.error('Select a destination bank account'); return; }
    const amt = parseFloat(data.amount);
    if (amt + fee > wallet.balance) { toast.error('Insufficient balance including fee'); return; }
    setStep(2);
    // Backend integration: POST /api/wallet/withdrawal/init → triggers OTP email
    toast.info('OTP sent to m***@gmail.com');
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setIsVerifying(true);
    setOtpError('');
    // Backend integration: POST /api/wallet/withdrawal/verify-otp
    await new Promise((r) => setTimeout(r, 2000));
    if (code === '123456') {
      setIsVerifying(false);
      setIsSuccess(true);
      toast.success('Withdrawal approved! Processing within 1 business day.');
    } else {
      setIsVerifying(false);
      setOtpError('Invalid OTP code. Check your email and try again.');
    }
  }

  function handleResendOtp() {
    setCanResend(false);
    setOtpTimer(OTP_TIMEOUT);
    setOtp(Array(6).fill(''));
    // Backend integration: POST /api/wallet/withdrawal/resend-otp
    toast.info('New OTP sent to your email');
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const selectedAcctData = USER_BANK_ACCOUNTS.find((a) => a.id === selectedAcct);
  const selectedBank = selectedAcctData ? getBankById(selectedAcctData.bankId, currency) : null;

  if (isSuccess) {
    const amt = parseFloat(amountVal);
    return (
      <AppLayout activeRoute="/withdrawal-flow">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="max-w-md mx-auto text-center py-16 space-y-5 fade-in">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Withdrawal Approved</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{fmtCurrency(amt, currency)}</span> will be transferred to your account within 1 business day.
            </p>
            {selectedBank && selectedAcctData && (
              <div className="flex items-center gap-3 p-3 card-elevated rounded-xl text-left">
                <BankLogo bank={selectedBank} size="md" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedBank.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedAcctData.accountNumber}</p>
                </div>
              </div>
            )}
            <div className="p-3 bg-secondary rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-tabular text-foreground">{fmtCurrency(amt, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-tabular text-foreground">{fmtCurrency(fee, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold text-foreground">Total Deducted</span>
                <span className="font-tabular font-bold text-danger">{fmtCurrency(amt + fee, currency)}</span>
              </div>
            </div>
            <button
              onClick={() => { setStep(1); setIsSuccess(false); setOtp(Array(6).fill('')); setSelectedAcct(null); }}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              Make Another Withdrawal
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeRoute="/withdrawal-flow">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16">
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Withdraw Funds</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Transfer PHP or KRW to your linked bank account</p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p>Demo only: withdrawals are not connected to Swiftpay and do not debit your wallet.</p>
          </div>

          <DepositStepIndicator currentStep={step} steps={STEPS} />

          <div className="card-surface p-6 fade-in">
            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-5">
                {/* Currency Toggle */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Withdraw Currency</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['PHP', 'KRW'] as const).map((c) => (
                      <button
                        key={`wc-${c}`}
                        type="button"
                        onClick={() => { setCurrency(c); setSelectedAcct(null); }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          currency === c
                            ? c === 'PHP' ? 'border-php/60 bg-php/10' : 'border-krw/60 bg-krw/10' :'border-border bg-secondary'
                        }`}
                      >
                        <p className={`font-bold ${c === 'PHP' ? 'text-php' : 'text-krw'}`}>{c === 'PHP' ? '₱' : '₩'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Balance: <span className="font-semibold text-foreground">{fmtCurrency(WALLET_BALANCES.find(b => b.currency === c)!.balance, c)}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Withdrawal Amount</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Available: {fmtCurrency(wallet.balance, currency)} · Min: {currency === 'KRW' ? '₩10,000' : '₱100'} · Max: {currency === 'KRW' ? '₩5,000,000' : '₱200,000'}
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                      {currency === 'PHP' ? '₱' : '₩'}
                    </span>
                    <input
                      {...register('amount', {
                        required: 'Amount is required',
                        validate: (v) => {
                          const n = parseFloat(v);
                          if (isNaN(n) || n <= 0) return 'Enter a valid amount';
                          const min = currency === 'KRW' ? 10000 : 100;
                          const max = currency === 'KRW' ? 5000000 : 200000;
                          if (n < min) return `Minimum withdrawal is ${fmtCurrency(min, currency)}`;
                          if (n > max) return `Maximum withdrawal is ${fmtCurrency(max, currency)}`;
                          if (n + fee > wallet.balance) return 'Insufficient balance (including fee)';
                          return true;
                        },
                      })}
                      type="number"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-danger mt-1.5">{errors.amount.message}</p>}
                </div>

                {/* Fee Preview */}
                {amountVal && !isNaN(parseFloat(amountVal)) && parseFloat(amountVal) > 0 && (
                  <div className="p-3 bg-secondary rounded-xl text-sm space-y-1.5">
                    <div className="fee-row">
                      <span className="text-muted-foreground">Withdrawal Amount</span>
                      <span className="font-tabular">{fmtCurrency(parseFloat(amountVal), currency)}</span>
                    </div>
                    <div className="fee-row">
                      <span className="text-muted-foreground">Transfer Fee</span>
                      <span className="font-tabular text-danger">-{fmtCurrency(fee, currency)}</span>
                    </div>
                    <div className="fee-row">
                      <span className="font-semibold text-foreground">Total Deducted</span>
                      <span className="font-tabular font-bold text-danger">{fmtCurrency(parseFloat(amountVal) + fee, currency)}</span>
                    </div>
                  </div>
                )}

                {/* Bank Account */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Destination Account</label>
                  <BankAccountSelector currency={currency} selectedId={selectedAcct} onSelect={setSelectedAcct} />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  Request Withdrawal
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <Mail size={24} className="text-primary" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">Email Verification</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    A 6-digit code was sent to <span className="text-foreground font-medium">m***@gmail.com</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use <span className="font-mono text-warning">123456</span> as the demo OTP
                  </p>
                </div>

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

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setOtp(Array(6).fill('')); setOtpError(''); }}
                    className="flex-1 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.join('').length < 6}
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                    ) : 'Verify & Withdraw'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}