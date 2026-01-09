import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  paymentId: string;
  amount?: number; // Optional - if not provided, refund full amount
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY2')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RefundRequest = await req.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Payment ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing orphan payment refund: ${paymentId}`);

    // Fetch payment from Moyasar to verify it exists and get amount
    const paymentResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
      },
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Moyasar payment fetch failed:', errorText);
      return new Response(JSON.stringify({ error: 'Payment not found in Moyasar' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await paymentResponse.json();
    console.log('Payment status:', payment.status, 'Amount:', payment.amount);

    // Validate payment can be refunded
    if (payment.status !== 'paid' && payment.status !== 'captured') {
      return new Response(JSON.stringify({ 
        error: `Payment cannot be refunded. Status: ${payment.status}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate refund amount (in halalas)
    const refundAmount = amount || payment.amount;
    const alreadyRefunded = payment.refunded || 0;
    const maxRefundable = payment.amount - alreadyRefunded;

    if (refundAmount > maxRefundable) {
      return new Response(JSON.stringify({ 
        error: `Refund amount exceeds maximum refundable: ${maxRefundable / 100} SAR` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process refund via Moyasar
    const refundResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: refundAmount }),
    });

    const refundResult = await refundResponse.json();
    console.log('Refund result:', JSON.stringify(refundResult));

    if (!refundResponse.ok) {
      return new Response(JSON.stringify({ 
        error: refundResult.message || 'Refund failed',
        details: refundResult
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the refund (with null booking_id since this is an orphan payment)
    await supabase.from('payment_logs').insert({
      booking_id: null,
      event_type: 'refund',
      payment_id: paymentId,
      amount: refundAmount,
      status_before: payment.status,
      status_after: refundResult.status || 'refunded',
      changed_by: user.id,
      metadata: {
        type: 'orphan_payment_refund',
        reason: reason || 'Orphan payment refund from admin panel',
        payment_description: payment.description,
        refund_response: refundResult,
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      refundedAmount: refundAmount / 100,
      currency: 'SAR',
      paymentId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Orphan refund error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
