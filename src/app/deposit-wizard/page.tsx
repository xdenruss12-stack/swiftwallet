'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import DepositStepIndicator from './components/DepositStepIndicator';
import BankGrid from './components/BankGrid';
import DepositConfirmation from './components/DepositConfirmation';
import { KRW_BANKS, PH_BANKS } from '@/lib/banks';
import { fmtCurrency } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

const STEPS = ['Select Currency & Bank', 'Enter Amount', 'Confirm Transfer'];

interface DepositFormValues {
  amount: string;
}

export default function DepositWizardPage() {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState<CurrencyCode>('PHP');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [banksLoading, setBanksLoading] = useState(true);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DepositFormValues>({ defaultValues: { amount: '' } });
  const amountVal = watch('amount');

  const banks = currency === 'KRW' ? KRW_BANKS : PH_BANKS;
  const reference = `DEP-${Date.now().toString().slice(-8)}`;
  const depositAccount = currency === 'KRW'
    ? { number: '110-****-**3301', name: 'SwiftWallet Korea Ltd.' }
    : { number: '0123-****-****-4567', name: 'SwiftWallet Philippines Inc.' };

  function handleNextStep1() {
    if (!selectedBank) { toast.error('Please select a bank to continue'); return; }
    setStep(2);
  }

  function onAmountSubmit(data: DepositFormValues) {
    const amt = parseFloat(data.amount);
    if (isNaN(amt) || amt <= 0) return;
    const min = currency === 'KRW' ? 10000 : 100;
    if (amt < min) { toast.error(`Minimum deposit is ${fmtCurrency(min, currency)}`); return; }
    setStep(3);
  }

  async function handleConfirm() {
    setIsLoading(true);
    // Backend integration point: POST /api/wallet/deposit
    await new Promise((r) => setTimeout(r, 1800));
    setIsLoading(false);
    setIsSuccess(true);
    toast.success('Deposit request submitted. Processing within 1–2 hours.');
  }

  // Simulate bank list loading on mount and currency switch
  useEffect(() => {
    setBanksLoading(true);
    const t = setTimeout(() => setBanksLoading(false), 700);
    return () => clearTimeout(t);
  }, [currency]);

  if (isSuccess) {
    return (
      <AppLayout activeRoute="/deposit-wizard">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="max-w-md mx-auto text-center py-16 space-y-4 fade-in">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Deposit Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your transfer of{' '}
              <span className="text-foreground font-semibold">{fmtCurrency(parseFloat(amountVal || '0'), currency)}</span>{' '}
              is being verified. Funds will appear within 1–2 business hours.
            </p>
            <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground">
              Reference: <span className="text-foreground font-mono">{reference}</span>
            </div>
            <button
              onClick={() => { setStep(1); setIsSuccess(false); setSelectedBank(null); }}
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
      <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deposit Funds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add money via bank transfer</p>
        </div>

        {/* Step Indicator */}
        <DepositStepIndicator currentStep={step} steps={STEPS} />

        {/* Step Content */}
        <div className="card-surface p-5 fade-in">
          {/* Step 1: Currency + Bank */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Select Currency</h2>
                <p className="text-xs text-muted-foreground mb-4">Choose which wallet to deposit into</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['PHP', 'KRW'] as CurrencyCode[]).map((c) => (
                    <button
                      key={`curr-${c}`}
                      onClick={() => { setCurrency(c); setSelectedBank(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                        currency === c
                          ? c === 'PHP' ? 'border-php/60 bg-php/10' : 'border-krw/60 bg-krw/10' :'border-border bg-secondary hover:border-border/80'
                      }`}
                    >
                      <p className={`text-lg font-bold ${c === 'PHP' ? 'text-php' : 'text-krw'}`}>{c === 'PHP' ? '₱' : '₩'}</p>
                      <p className="text-sm font-semibold text-foreground">{c}</p>
                      <p className="text-xs text-muted-foreground">{c === 'PHP' ? 'Philippine Peso' : 'Korean Won'}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Select Bank</h2>
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
                <h2 className="text-base font-semibold text-foreground mb-1">Enter Deposit Amount</h2>
                <p className="text-xs text-muted-foreground">
                  Minimum: {currency === 'KRW' ? '₩10,000' : '₱100'} · Maximum: {currency === 'KRW' ? '₩10,000,000' : '₱500,000'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Amount ({currency})
                </label>
                <p className="text-xs text-muted-foreground mb-2">Enter the exact amount you will transfer to the bank</p>
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
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Transfer Instructions</h2>
                <p className="text-xs text-muted-foreground">Send to the account below and include the reference code</p>
              </div>
              <DepositConfirmation
                currency={currency}
                bankId={selectedBank!}
                amount={parseFloat(amountVal)}
                reference={reference}
                accountNumber={depositAccount.number}
                accountName={depositAccount.name}
                onConfirm={handleConfirm}
                isLoading={isLoading}
              />
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