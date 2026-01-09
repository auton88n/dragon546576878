import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  source: {
    type: string;
    company?: string;
  };
  metadata?: Record<string, unknown>;
}

interface MoyasarListResponse {
  payments: MoyasarPayment[];
  meta: {
    current_page: number;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    total_count: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated staff
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: 'Access denied - staff only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Moyasar secret key
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY2');
    if (!moyasarSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Moyasar secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL paid payments from Moyasar with pagination
    let allPayments: MoyasarPayment[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    const perPage = 100; // Max per page for Moyasar

    console.log('Fetching Moyasar payments...');

    while (hasMorePages) {
      const moyasarUrl = `https://api.moyasar.com/v1/payments?status=paid&per_page=${perPage}&page=${currentPage}`;
      
      const response = await fetch(moyasarUrl, {
        headers: {
          'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Moyasar API error:', response.status, errorText);
        throw new Error(`Moyasar API error: ${response.status}`);
      }

      const data: MoyasarListResponse = await response.json();
      allPayments = [...allPayments, ...data.payments];

      console.log(`Fetched page ${currentPage}/${data.meta.total_pages}, got ${data.payments.length} payments`);

      if (data.meta.next_page === null || currentPage >= data.meta.total_pages) {
        hasMorePages = false;
      } else {
        currentPage++;
      }
    }

    // Calculate Moyasar totals (amount is in halalas, divide by 100 for SAR)
    const moyasarTotalHalalas = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const moyasarTotalSAR = moyasarTotalHalalas / 100;
    const moyasarPaymentCount = allPayments.length;

    // Get payment method breakdown from Moyasar
    const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {};
    allPayments.forEach((p) => {
      const method = p.source?.type || 'unknown';
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentMethodBreakdown[method].count++;
      paymentMethodBreakdown[method].amount += p.amount / 100;
    });

    // Fetch database totals (excluding test emails)
    const testEmailPatterns = ['%test%', '%example%'];
    const specificTestEmails = ['crossmint7@gmail.com'];

    const { data: dbBookings, error: dbError } = await supabase
      .from('bookings')
      .select('total_amount, payment_method')
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'completed')
      .not('customer_email', 'ilike', testEmailPatterns[0])
      .not('customer_email', 'ilike', testEmailPatterns[1])
      .not('customer_email', 'in', `(${specificTestEmails.join(',')})`)
      .limit(10000);

    if (dbError) {
      console.error('Database query error:', dbError);
      throw new Error('Failed to fetch database totals');
    }

    const databaseTotalSAR = dbBookings?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;
    const databaseBookingCount = dbBookings?.length || 0;

    // Calculate discrepancy
    const discrepancy = Math.abs(moyasarTotalSAR - databaseTotalSAR);
    const match = discrepancy < 1; // Allow 1 SAR tolerance for rounding

    const result = {
      moyasar: {
        totalPaid: moyasarTotalSAR,
        paymentCount: moyasarPaymentCount,
        currency: 'SAR',
        paymentMethods: paymentMethodBreakdown,
      },
      database: {
        totalRevenue: databaseTotalSAR,
        bookingCount: databaseBookingCount,
      },
      match,
      discrepancy,
      verifiedAt: new Date().toISOString(),
    };

    console.log('Verification result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-moyasar-totals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});