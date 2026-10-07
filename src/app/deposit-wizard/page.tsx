'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import DepositStepIndicator from './components/DepositStepIndicator';
import { fmtCurrency } from '@/lib/currency';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

const STEPS = ['Select Currency', 'Enter Amount', 'Secure Checkout'];
const DEPOSIT_STATUSES = ['PENDING', 'PAID', 'REJECTED', 'CANCELED', 'EXPIRED', 'FAILED'] as const;
type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

interface DepositFormValues {
  amount: string;
}

interface DepositStatusResponse {
  reference: string;
  amount: number;
  currency: 'PHP';
  status: DepositStatus;
}

export default function DepositWizardPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedReference, setTrackedReference] = useState<string | null>(null);
  const [trackedDeposit, setTrackedDeposit] = useState<DepositStatusResponse | null>(null);
  const [statusError, setStatusError] = useState('');
  const [checkoutUncertain, setCheckoutUncertain] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DepositFormValues>({ defaultValues: { amount: '' } });
  const amountVal = watch('amount');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (reference) setTrackedReference(reference);
    if (params.get('checkoutUncertain') === '1') setCheckoutUncertain(true);
  }, []);

  useEffect(() => {
    if (!trackedReference) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout>;

    async function refreshStatus() {
      const response = await fetch(
        `/api/wallet/deposits/${encodeURIComponent(trackedReference!)}`,
        { cache: 'no-store' }
      );
      const result = (await response.json()) as DepositStatusResponse | { error?: string };

      if (!response.ok) {
        throw new Error('Unable to load your deposit status. Please try again later.');
      }

      if (!active || !('status' in result) || !DEPOSIT_STATUSES.includes(result.status)) return;
      setTrackedDeposit(result);
      setStatusError('');
      if (result.status === 'PENDING') {
        timeout = setTimeout(() => {
          refreshStatus().catch(() => {
            if (active) setStatusError('Unable to refresh deposit status. Please try again later.');
          });
        }, 3000);
      }
    }

    refreshStatus().catch(() => {
      if (active) setStatusError('Unable to load your deposit status. Please try again later.');
    });

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [trackedReference]);

  function handleNextStep1() {
    setStep(2);
  }

  function onAmountSubmit(data: DepositFormValues) {
    const amt = parseFloat(data.amount);
    if (isNaN(amt) || amt <= 0) return;
    const min = 100;
    if (amt < min) {
      toast.error(`Minimum deposit is ${fmtCurrency(min, 'PHP')}`);
      return;
    }
    setStep(3);
  }

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/deposits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: amountVal }),
      });
      const result = (await response.json()) as {
        customerRedirectUrl?: string;
        error?: string;
        reference?: string;
        checkoutUncertain?: boolean;
      };

      if (!response.ok || !result.customerRedirectUrl) {
        if (result.reference) {
          const checkoutUncertain = result.checkoutUncertain === true;
          setCheckoutUncertain(checkoutUncertain);
          const params = new URLSearchParams({ reference: result.reference });
          if (checkoutUncertain) params.set('checkoutUncertain', '1');
          window.history.replaceState(null, '', `/deposit-wizard?${params}`);
          setTrackedReference(result.reference);
        }
        throw new Error(result.error ?? 'Unable to create a Swiftpay payment request.');
      }

      window.location.assign(result.customerRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create a deposit request.');
      setIsLoading(false);
    }
  }

  if (trackedReference) {
    const isPaid = trackedDeposit?.status === 'PAID';
    const isPending = trackedDeposit?.status === 'PENDING' || !trackedDeposit;
    return (
      <AppLayout activeRoute="/deposit-wizard">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="max-w-md mx-auto text-center py-16 space-y-4 fade-in">
            <div
              className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto ${
                isPaid
                  ? 'bg-accent/20 border-accent/40'
                  : isPending
                    ? 'bg-warning/10 border-warning/30'
                    : 'bg-danger/10 border-danger/30'
              }`}
            >
              {isPaid ? (
                <CheckCircle2 size={40} className="text-accent" />
              ) : isPending ? (
                <Clock size={36} className="text-warning" />
              ) : (
                <AlertCircle size={36} className="text-danger" />
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {isPaid
                ? 'Deposit Confirmed'
                : isPending
                  ? 'Payment Processing'
                  : 'Payment Not Completed'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {statusError
                ? statusError
                : isPaid
                  ? `${fmtCurrency(trackedDeposit?.amount ?? 0, 'PHP')} has been credited to your PHP wallet.`
                  : isPending
                    ? checkoutUncertain
                      ? 'We could not confirm whether Swiftpay created this payment. Do not retry yet; contact support with this reference.'
                      : 'We are waiting for Swiftpay to confirm your payment. This page will update automatically.'
                    : `Swiftpay reported the payment as ${trackedDeposit?.status.toLowerCase() ?? 'not completed'}. No funds were credited.`}
            </p>
            <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground">
              Reference: <span className="text-foreground font-mono">{trackedReference}</span>
              {trackedDeposit && (
                <p className="mt-1">
                  Amount:{' '}
                  <span className="text-foreground">
                    {fmtCurrency(trackedDeposit.amount, 'PHP')}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={() => {
                window.history.replaceState(null, '', '/deposit-wizard');
                setTrackedReference(null);
                setTrackedDeposit(null);
                setStatusError('');
                setCheckoutUncertain(false);
                setStep(1);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              Start Another Deposit
            </button>
            {isPending && (
              <Link
                href="/"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                Return to wallet <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeRoute="/deposit-wizard">
      <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deposit Funds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add PHP to your wallet through Swiftpay
          </p>
        </div>

        {/* Step Indicator */}
        <DepositStepIndicator currentStep={step} steps={STEPS} />

        {/* Step Content */}
        <div className="card-surface p-5 fade-in">
          {/* Step 1: Currency */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Select Currency</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Swiftpay collection is currently available for PHP.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border-2 border-php/60 bg-php/10 text-left">
                    <p className="text-lg font-bold text-php">₱</p>
                    <p className="text-sm font-semibold text-foreground">PHP</p>
                    <p className="text-xs text-muted-foreground">Swiftpay secure checkout</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-secondary/50 text-left opacity-60">
                    <p className="text-lg font-bold text-krw">₩</p>
                    <p className="text-sm font-semibold text-foreground">KRW</p>
                    <p className="text-xs text-muted-foreground">Not available for collection</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Payment method</h2>
                <p className="text-xs text-muted-foreground">
                  Available payment institutions will be shown on Swiftpay&apos;s secure checkout
                  page.
                </p>
              </div>

              <button
                onClick={handleNextStep1}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150"
              >
                Continue to Amount
              </button>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">
                  Enter Deposit Amount
                </h2>
                <p className="text-xs text-muted-foreground">Minimum: ₱100 · Maximum: ₱500,000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Amount (PHP)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter the amount you want to deposit.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    ₱
                  </span>
                  <input
                    {...register('amount', {
                      required: 'Amount is required',
                      validate: (v) => {
                        const n = parseFloat(v);
                        const min = 100;
                        const max = 500000;
                        if (isNaN(n) || n <= 0) return 'Enter a valid amount';
                        if (n < min) return `Minimum deposit is ${fmtCurrency(min, 'PHP')}`;
                        if (n > max) return `Maximum deposit is ${fmtCurrency(max, 'PHP')}`;
                        if (!/^\d+(?:\.\d{1,2})?$/.test(v))
                          return 'Use no more than two decimal places';
                        return true;
                      },
                    })}
                    type="number"
                    placeholder="0.00"
                    min="100"
                    max="500000"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-danger mt-1.5">{errors.amount.message}</p>
                )}
              </div>

              {amountVal && !isNaN(parseFloat(amountVal)) && parseFloat(amountVal) > 0 && (
                <div className="p-3 bg-secondary rounded-xl space-y-1.5 text-sm">
                  <div className="fee-row">
                    <span className="text-muted-foreground">Deposit Amount</span>
                    <span className="font-tabular text-foreground">
                      {fmtCurrency(parseFloat(amountVal), 'PHP')}
                    </span>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Any payment processing fee will be shown by Swiftpay before you authorize
                    payment.
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  Review Details
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Checkout */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">
                  Review your deposit
                </h2>
                <p className="text-xs text-muted-foreground">
                  You will choose a payment institution on Swiftpay&apos;s secure page.
                </p>
              </div>
              <div className="p-4 bg-secondary rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit amount</span>
                  <span className="font-semibold text-foreground">
                    {fmtCurrency(parseFloat(amountVal), 'PHP')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Swiftpay will show the final payment amount and any fees before you authorize the
                  payment.
                </p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connecting to Swiftpay...' : 'Continue to secure checkout'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-transparent border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150"
              >
                Back to Amount
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
