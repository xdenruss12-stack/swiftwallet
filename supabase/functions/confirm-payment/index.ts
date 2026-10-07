import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ConfirmPaymentBody {
  paymentIntentId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
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

    const { paymentIntentId } = (await req.json()) as ConfirmPaymentBody;

    // Retrieve payment intent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find the transaction record
    const { data: record, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (findError || !record) {
      return new Response(
        JSON.stringify({ error: 'Transaction record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Stripe status to our tx_status enum
    let txStatus: 'completed' | 'pending' | 'processing' | 'failed' = 'pending';
    if (paymentIntent.status === 'succeeded') txStatus = 'completed';
    else if (paymentIntent.status === 'processing') txStatus = 'processing';
    else if (
      paymentIntent.status === 'canceled' ||
      paymentIntent.status === 'requires_payment_method'
    ) txStatus = 'failed';

    // Update transaction status
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        tx_status: txStatus,
        stripe_charge_id: paymentIntent.latest_charge as string ?? '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Transaction update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: txStatus, recordId: record.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Confirmation failed';
    console.error('confirm-payment error:', e);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
