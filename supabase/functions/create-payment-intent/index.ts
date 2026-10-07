import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface BillingAddress {
  address_line_1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CustomerInfo {
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  stripeCustomerId: string | null;
  billing: BillingAddress;
}

interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  reference: string;
  bankId: string;
  channel: string;
}

interface CreatePaymentIntentRequest {
  paymentData: PaymentData;
  customerInfo: CustomerInfo;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { paymentData, customerInfo } = (await req.json()) as CreatePaymentIntentRequest;

    // Validate amount
    const minAmount = paymentData.currency === 'KRW' ? 10000 : 100;
    const maxAmount = paymentData.currency === 'KRW' ? 10000000 : 500000;
    if (paymentData.amount < minAmount || paymentData.amount > maxAmount) {
      return new Response(
        JSON.stringify({ error: `Amount must be between ${minAmount} and ${maxAmount} ${paymentData.currency}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map currency to ISO 4217
    const stripeCurrency = paymentData.currency.toLowerCase(); // 'php' or 'krw'

    // Create or update Stripe Customer
    const customerData: Stripe.CustomerCreateParams = {
      name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
      email: customerInfo.email,
      address: {
        line1: customerInfo.billing.address_line_1,
        city: customerInfo.billing.city,
        state: customerInfo.billing.state,
        postal_code: customerInfo.billing.postal_code,
        country: customerInfo.billing.country,
      },
    };

    const stripeCustomer = customerInfo.stripeCustomerId
      ? await stripe.customers.update(customerInfo.stripeCustomerId, customerData)
      : await stripe.customers.create(customerData);

    // KRW is zero-decimal currency, PHP uses cents (smallest unit = centavo)
    // KRW: amount as-is (no multiplier), PHP: multiply by 100
    const stripeAmount = stripeCurrency === 'krw'
      ? Math.round(paymentData.amount)
      : Math.round(paymentData.amount * 100);

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: stripeCurrency,
      customer: stripeCustomer.id,
      description: paymentData.description,
      metadata: {
        reference: paymentData.reference,
        bank_id: paymentData.bankId,
        channel: paymentData.channel,
        user_id: customerInfo.userId ?? 'guest',
      },
    });

    // Save pending transaction record
    const { data: txRecord, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: customerInfo.userId,
        tx_type: 'deposit',
        currency: paymentData.currency,
        amount: paymentData.amount,
        direction: 'in',
        tx_status: 'pending',
        description: paymentData.description,
        reference: paymentData.reference,
        channel: paymentData.channel,
        payment_intent_id: paymentIntent.id,
        metadata: {
          bank_id: paymentData.bankId,
          stripe_customer_id: stripeCustomer.id,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction insert error:', txError);
      // Cancel the payment intent if DB insert fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        recordId: txRecord.id,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Payment setup failed';
    console.error('create-payment-intent error:', e);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
