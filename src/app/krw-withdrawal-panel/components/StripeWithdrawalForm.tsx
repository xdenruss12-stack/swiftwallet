'use client';
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { fmtCurrency } from '@/lib/currency';
import { AlertTriangle, Lock, CreditCard } from 'lucide-react';

interface StripeWithdrawalFormProps {
  amount: number;
  stripeFee: number;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#e2e8f0',
      fontFamily: 'inherit',
      '::placeholder': { color: '#64748b' },
      iconColor: '#94a3b8',
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
};

export default function StripeWithdrawalForm({ amount, stripeFee, onSuccess, onBack }: StripeWithdrawalFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const totalCharged = amount + stripeFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    if (!email.trim() || !name.trim()) {
      setCardError('Please fill in your name and email.');
      return;
    }

    setIsProcessing(true);
    setCardError('');

    try {
      // Create payment intent via Supabase edge function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey ?? '',
        },
        body: JSON.stringify({
          paymentData: {
            amount: totalCharged,
            currency: 'KRW',
            description: `KRW Withdrawal - ₩${amount.toLocaleString()} + ₩${stripeFee.toLocaleString()} Stripe fee`,
            reference: `KRW-WD-${Date.now()}`,
            bankId: 'stripe',
            channel: 'stripe_card',
          },
          customerInfo: {
            userId: null,
            firstName: name.split(' ')[0] ?? name,
            lastName: name.split(' ').slice(1).join(' ') || '-',
            email: email,
            stripeCustomerId: null,
            billing: {
              address_line_1: '-',
              city: 'Seoul',
              state: 'Seoul',
              postal_code: '00000',
              country: 'KR',
            },
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        setCardError(data.error ?? 'Failed to initialize payment. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Confirm card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name, email },
        },
      });

      if (stripeError) {
        setCardError(stripeError.message ?? 'Card payment failed.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        onSuccess(paymentIntent.id);
      } else {
        setCardError('Payment was not completed. Please try again.');
        setIsProcessing(false);
      }
    } catch {
      setCardError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-4 sm:p-6 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <CreditCard size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pay with Card</h2>
          <p className="text-xs text-muted-foreground">Stripe securely processes your payment</p>
        </div>
      </div>

      {/* Charge summary */}
      <div className="p-3 bg-secondary rounded-xl border border-border space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Withdrawal Amount</span>
          <span className="font-tabular text-foreground">{fmtCurrency(amount, 'KRW')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stripe Fee (2.9% + ₩350)</span>
          <span className="font-tabular text-warning">+{fmtCurrency(stripeFee, 'KRW')}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-1">
          <span className="font-semibold text-foreground">Total Card Charge</span>
          <span className="font-tabular font-bold text-primary">{fmtCurrency(totalCharged, 'KRW')}</span>
        </div>
      </div>

      {/* Billing details */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cardholder Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name on card"
            className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Card Details</label>
          <div className="px-3.5 py-3 bg-secondary border border-border rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {cardError && (
        <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl">
          <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{cardError}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock size={11} className="flex-shrink-0" />
        <span>Secured by Stripe. Your card details are never stored on our servers.</span>
      </div>

      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
          ) : (
            <>{`Pay ${fmtCurrency(totalCharged, 'KRW')}`}</>
          )}
        </button>
      </div>
    </form>
  );
}
