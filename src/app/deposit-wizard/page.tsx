'use client';
import React, { useState, useEffect, FormEvent } from 'react';
import AppLayout from '@/components/AppLayout';
import DepositStepIndicator from './components/DepositStepIndicator';
import BankGrid from './components/BankGrid';

import { KRW_BANKS, PH_BANKS } from '@/lib/banks';
import { fmtCurrency } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { PaymentIntent } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STEPS = ['Select Currency & Bank', 'Enter Amount', 'Pay Securely'];

interface DepositFormValues {
  amount: string;
}

interface BillingFormValues {
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ─── Inner Stripe Payment Form ────────────────────────────────────────────────
interface StripePaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntent: PaymentIntent) => void;
  onError: (msg: string) => void;
}

function StripePaymentForm({ clientSecret, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/deposit-wizard`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm on backend
        const { data, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
          body: { paymentIntentId: paymentIntent.id },
        });

        if (confirmError) {
          console.error('Backend confirm error:', confirmError);
          onError((data as { error?: string })?.error ?? confirmError.message ?? 'Confirmation failed');
          setIsProcessing(false);
          return;
        }

        onSuccess(paymentIntent);
      } else if (paymentIntent?.status === 'processing') {
        // Payment is processing — treat as success for UX
        const { data, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
          body: { paymentIntentId: paymentIntent.id },
        });
        if (confirmError) {
          console.error('Backend confirm error:', confirmError);
        }
        onSuccess(paymentIntent);
      } else {
        onError('Payment was not completed. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      onError(msg);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing Payment...
          </>
        ) : (
          'Pay Now'
        )}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepositWizardPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState<CurrencyCode>('PHP');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [banksLoading, setBanksLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [reference, setReference] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DepositFormValues>({
    defaultValues: { amount: '' },
  });
  const amountVal = watch('amount');

  const {
    register: registerBilling,
    handleSubmit: handleBillingSubmit,
    formState: { errors: billingErrors },
  } = useForm<BillingFormValues>({
    defaultValues: {
      firstName: user?.user_metadata?.full_name?.split(' ')[0] ?? '',
      lastName: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '',
      email: user?.email ?? '',
      addressLine1: '',
      city: '',
      state: '',
      postalCode: '',
      country: currency === 'KRW' ? 'KR' : 'PH',
    },
  });

  const banks = currency === 'KRW' ? KRW_BANKS : PH_BANKS;
  const stripePromise = getStripe();

  function handleNextStep1() {
    if (!selectedBank) {
      toast.error('Please select a bank to continue');
      return;
    }
    setStep(2);
  }

  function onAmountSubmit() {
    const amt = parseFloat(amountVal);
    if (isNaN(amt) || amt <= 0) return;
    const min = currency === 'KRW' ? 10000 : 100;
    if (amt < min) {
      toast.error(`Minimum deposit is ${fmtCurrency(min, currency)}`);
      return;
    }
    setStep(3);
  }

  async function onBillingSubmit(billing: BillingFormValues) {
    const amt = parseFloat(amountVal);
    const ref = `DEP-${Date.now().toString().slice(-8)}`;
    setReference(ref);
    setIsCreatingIntent(true);
    setPaymentError(null);

    const supabase = createClient();

    try {
      const channel = currency === 'KRW' ? 'KRW_BANK_TRANSFER' : 'PHP_BANK_TRANSFER';
      const { data, error } = await supabase.functions.invoke<{
        clientSecret: string;
        recordId: string;
        paymentIntentId: string;
        error?: string;
      }>('create-payment-intent', {
        body: {
          paymentData: {
            amount: amt,
            currency,
            description: `${currency} Deposit via ${selectedBank}`,
            reference: ref,
            bankId: selectedBank,
            channel,
          },
          customerInfo: {
            userId: user?.id ?? null,
            firstName: billing.firstName,
            lastName: billing.lastName,
            email: billing.email,
            stripeCustomerId: null,
            billing: {
              address_line_1: billing.addressLine1,
              city: billing.city,
              state: billing.state,
              postal_code: billing.postalCode,
              country: billing.country,
            },
          },
        },
      });

      if (error) {
        const msg = (data as { error?: string })?.error ?? error.message ?? 'Failed to initialize payment';
        setPaymentError(msg);
        toast.error(msg);
        setIsCreatingIntent(false);
        return;
      }

      if (!data?.clientSecret) {
        setPaymentError('Payment initialization failed. Please try again.');
        setIsCreatingIntent(false);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize payment';
      setPaymentError(msg);
      toast.error(msg);
    }

    setIsCreatingIntent(false);
  }

  function handlePaymentSuccess() {
    setIsSuccess(true);
    toast.success('Deposit successful! Funds will appear in your wallet shortly.');
  }

  function handlePaymentError(msg: string) {
    setPaymentError(msg);
    toast.error(msg);
  }

  // Simulate bank list loading on mount and currency switch
  useEffect(() => {
    setBanksLoading(true);
    const t = setTimeout(() => setBanksLoading(false), 700);
    return () => clearTimeout(t);
  }, [currency]);

  // ─── Success Screen ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <AppLayout activeRoute="/deposit-wizard">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="max-w-md mx-auto text-center py-16 space-y-4 fade-in">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Deposit Successful!</h2>
            <p className="text-sm text-muted-foreground">
              Your deposit of{' '}
              <span className="text-foreground font-semibold">{fmtCurrency(parseFloat(amountVal || '0'), currency)}</span>{' '}
              has been processed. Funds will appear in your wallet shortly.
            </p>
            <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground">
              Reference: <span className="text-foreground font-mono">{reference}</span>
            </div>
            <button
              onClick={() => {
                setStep(1);
                setIsSuccess(false);
                setSelectedBank(null);
                setClientSecret(null);
                setPaymentError(null);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              Make Another Deposit
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeRoute="/deposit-wizard">
      <div className="max-w-2xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-base sm:text-xl font-semibold text-foreground">Deposit Funds</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Add money via Stripe secure payment</p>
        </div>

        {/* Step Indicator */}
        <DepositStepIndicator currentStep={step} steps={STEPS} />

        {/* Step Content */}
        <div className="card-surface p-4 sm:p-5 fade-in">

          {/* ── Step 1: Currency + Bank ── */}
          {step === 1 && (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-1">Select Currency</h2>
                <p className="text-xs text-muted-foreground mb-3">Choose which wallet to deposit into</p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {(['PHP', 'KRW'] as CurrencyCode[]).map((c) => (
                    <button
                      key={`curr-${c}`}
                      onClick={() => { setCurrency(c); setSelectedBank(null); }}
                      className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all duration-150 min-h-[80px] ${
                        currency === c
                          ? c === 'PHP' ? 'border-php/60 bg-php/10' : 'border-krw/60 bg-krw/10' :'border-border bg-secondary hover:border-border/80'
                      }`}
                    >
                      <p className={`text-lg sm:text-xl font-bold ${c === 'PHP' ? 'text-php' : 'text-krw'}`}>{c === 'PHP' ? '₱' : '₩'}</p>
                      <p className="text-sm font-semibold text-foreground">{c}</p>
                      <p className="text-xs text-muted-foreground">{c === 'PHP' ? 'Philippine Peso' : 'Korean Won'}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-1">Select Bank</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  {currency === 'KRW' ? 'Korean banks available for KRW transfer' : 'Philippine banks and e-wallets'}
                </p>
                <BankGrid
                  banks={banks}
                  selectedId={selectedBank}
                  onSelect={setSelectedBank}
                  currency={currency as 'KRW' | 'PHP'}
                  isLoading={banksLoading}
                />
              </div>

              <button
                onClick={handleNextStep1}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 min-h-[48px]"
              >
                Continue to Amount
              </button>
            </div>
          )}

          {/* ── Step 2: Amount ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-1">Enter Deposit Amount</h2>
                <p className="text-xs text-muted-foreground">
                  Minimum: {currency === 'KRW' ? '₩10,000' : '₱100'} · Maximum: {currency === 'KRW' ? '₩10,000,000' : '₱500,000'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Amount ({currency})
                </label>
                <p className="text-xs text-muted-foreground mb-2">Enter the exact amount you wish to deposit</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    {currency === 'PHP' ? '₱' : '₩'}
                  </span>
                  <input
                    {...register('amount', {
                      required: 'Amount is required',
                      validate: (v) => {
                        const n = parseFloat(v);
                        const min = currency === 'KRW' ? 10000 : 100;
                        const max = currency === 'KRW' ? 10000000 : 500000;
                        if (isNaN(n) || n <= 0) return 'Enter a valid amount';
                        if (n < min) return `Minimum deposit is ${fmtCurrency(min, currency)}`;
                        if (n > max) return `Maximum deposit is ${fmtCurrency(max, currency)}`;
                        return true;
                      },
                    })}
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3.5 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {errors.amount && <p className="text-xs text-danger mt-1.5">{errors.amount.message}</p>}
              </div>

              {amountVal && !isNaN(parseFloat(amountVal)) && parseFloat(amountVal) > 0 && (
                <div className="p-3 bg-secondary rounded-xl space-y-1.5 text-sm">
                  <div className="fee-row">
                    <span className="text-muted-foreground">Deposit Amount</span>
                    <span className="font-tabular text-foreground">{fmtCurrency(parseFloat(amountVal), currency)}</span>
                  </div>
                  <div className="fee-row">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-tabular text-accent">Free</span>
                  </div>
                  <div className="fee-row">
                    <span className="font-semibold text-foreground">You will receive</span>
                    <span className="font-tabular font-bold text-accent">{fmtCurrency(parseFloat(amountVal), currency)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150 min-h-[48px]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 min-h-[48px]"
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Stripe Payment ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-1">Secure Payment</h2>
                <p className="text-xs text-muted-foreground">
                  Depositing{' '}
                  <span className="text-foreground font-semibold">{fmtCurrency(parseFloat(amountVal || '0'), currency)}</span>{' '}
                  via Stripe
                </p>
              </div>

              {/* Payment error banner */}
              {paymentError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger">{paymentError}</p>
                </div>
              )}

              {/* Billing form — shown before Stripe Elements */}
              {!clientSecret && (
                <form onSubmit={handleBillingSubmit(onBillingSubmit)} className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Billing Details</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">First Name</label>
                      <input
                        {...registerBilling('firstName', { required: 'Required' })}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Juan"
                      />
                      {billingErrors.firstName && <p className="text-xs text-danger mt-0.5">{billingErrors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Last Name</label>
                      <input
                        {...registerBilling('lastName', { required: 'Required' })}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Dela Cruz"
                      />
                      {billingErrors.lastName && <p className="text-xs text-danger mt-0.5">{billingErrors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Email</label>
                    <input
                      {...registerBilling('email', { required: 'Required' })}
                      type="email"
                      inputMode="email"
                      className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="juan@example.com"
                    />
                    {billingErrors.email && <p className="text-xs text-danger mt-0.5">{billingErrors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Address</label>
                    <input
                      {...registerBilling('addressLine1', { required: 'Required' })}
                      className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="123 Main Street"
                    />
                    {billingErrors.addressLine1 && <p className="text-xs text-danger mt-0.5">{billingErrors.addressLine1.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">City</label>
                      <input
                        {...registerBilling('city', { required: 'Required' })}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder={currency === 'KRW' ? 'Seoul' : 'Manila'}
                      />
                      {billingErrors.city && <p className="text-xs text-danger mt-0.5">{billingErrors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">State / Province</label>
                      <input
                        {...registerBilling('state', { required: 'Required' })}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder={currency === 'KRW' ? 'Seoul' : 'NCR'}
                      />
                      {billingErrors.state && <p className="text-xs text-danger mt-0.5">{billingErrors.state.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Postal Code</label>
                      <input
                        {...registerBilling('postalCode', { required: 'Required' })}
                        inputMode="numeric"
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder={currency === 'KRW' ? '04524' : '1000'}
                      />
                      {billingErrors.postalCode && <p className="text-xs text-danger mt-0.5">{billingErrors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Country</label>
                      <select
                        {...registerBilling('country', { required: 'Required' })}
                        className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="PH">Philippines (PH)</option>
                        <option value="KR">South Korea (KR)</option>
                        <option value="US">United States (US)</option>
                        <option value="SG">Singapore (SG)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-3.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150 min-h-[48px]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingIntent}
                      className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      {isCreatingIntent ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        'Proceed to Payment'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Stripe Elements — shown after clientSecret is ready */}
              {clientSecret && (
                <div className="space-y-4">
                  <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">
                      Payment initialized. Complete your card details below to deposit{' '}
                      <span className="font-semibold">{fmtCurrency(parseFloat(amountVal || '0'), currency)}</span>.
                    </p>
                  </div>

                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#6366f1',
                          colorBackground: '#1e1e2e',
                          colorText: '#e2e8f0',
                          colorDanger: '#ef4444',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          borderRadius: '12px',
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      clientSecret={clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </Elements>

                  <button
                    onClick={() => {
                      setClientSecret(null);
                      setPaymentError(null);
                    }}
                    className="w-full py-3 rounded-xl bg-transparent border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-150 min-h-[44px]"
                  >
                    Change Billing Details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}