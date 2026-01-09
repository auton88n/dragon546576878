import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  paymentId: string;
  amount?: number;
  customerEmail?: string;
  reason?: string;
}

// Generate bilingual apology email HTML
function generateApologyEmailHtml(
  refundAmount: number,
  paymentId: string,
  reason?: string
): string {
  const formattedAmount = refundAmount.toFixed(2);
  const shortPaymentId = paymentId.slice(0, 12);
  const refundDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const reasonHtml = reason ? `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5;">
        <span style="color: #8B7355; font-weight: 600;">السبب / Reason:</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5; text-align: left;" dir="ltr">
        ${reason}
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>تم استرداد المبلغ | Refund Processed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6F1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F1; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 30px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">سوق المفيجر</h1>
              <p style="color: #C9A86C; margin: 8px 0 0 0; font-size: 14px;">Souq Almufaijer</p>
            </td>
          </tr>

          <!-- Apology Message -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <div style="background: linear-gradient(135deg, #FFF8E7 0%, #FFF3D6 100%); border-radius: 12px; padding: 24px; border-right: 4px solid #C9A86C; text-align: center;">
                <p style="color: #5C4A3A; font-size: 18px; margin: 0 0 12px 0; font-weight: 600;">
                  نعتذر عن أي إزعاج قد تعرضتم له
                </p>
                <p style="color: #5C4A3A; font-size: 16px; margin: 0; font-weight: 500;" dir="ltr">
                  We sincerely apologize for any inconvenience caused
                </p>
              </div>
            </td>
          </tr>

          <!-- Refund Success Box -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 12px; padding: 24px; text-align: center;">
                <div style="width: 50px; height: 50px; background-color: #4CAF50; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 28px;">✓</span>
                </div>
                <h2 style="color: #2E7D32; margin: 0 0 8px 0; font-size: 22px;">تم استرداد المبلغ بنجاح</h2>
                <p style="color: #388E3C; margin: 0; font-size: 16px;" dir="ltr">Refund Processed Successfully</p>
              </div>
            </td>
          </tr>

          <!-- Refund Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #FDFBF7; border-radius: 12px; padding: 24px; border: 1px solid #e8e0d5;">
                <h3 style="color: #5C4A3A; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #C9A86C; padding-bottom: 8px;">
                  تفاصيل الاسترداد / Refund Details
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5;">
                      <span style="color: #8B7355; font-weight: 600;">المبلغ / Amount:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5; text-align: left; color: #2E7D32; font-weight: 700; font-size: 18px;" dir="ltr">
                      ${formattedAmount} SAR
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5;">
                      <span style="color: #8B7355; font-weight: 600;">رقم العملية / Reference:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5; text-align: left; font-family: monospace;" dir="ltr">
                      ${shortPaymentId}...
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5;">
                      <span style="color: #8B7355; font-weight: 600;">التاريخ / Date:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e0d5; text-align: left;" dir="ltr">
                      ${refundDate}
                    </td>
                  </tr>
                  ${reasonHtml}
                </table>
              </div>
            </td>
          </tr>

          <!-- Bank Processing Note -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #4A3625; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: #FFFFFF; margin: 0 0 8px 0; font-size: 14px;">
                  ⏱️ سيظهر المبلغ في حسابك خلال 3-5 أيام عمل
                </p>
                <p style="color: #C9A86C; margin: 0; font-size: 13px;" dir="ltr">
                  The refund will appear in your account within 3-5 business days
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FDFBF7; padding: 24px 30px; text-align: center; border-top: 1px solid #e8e0d5;">
              <p style="color: #8B7355; margin: 0 0 8px 0; font-size: 14px;">
                للاستفسارات: info@almufaijer.com
              </p>
              <p style="color: #A89882; margin: 0; font-size: 12px;">
                سوق المفيجر - تراث حي | Souq Almufaijer - Living Heritage
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY2')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

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
    const { paymentId, amount, customerEmail, reason } = body;

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
        customer_email: customerEmail,
      },
    });

    // Send apology email if customer email provided
    let emailSent = false;
    if (customerEmail && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const refundAmountSAR = refundAmount / 100;
        
        const emailHtml = generateApologyEmailHtml(refundAmountSAR, paymentId, reason);

        const emailResponse = await resend.emails.send({
          from: 'Souq Almufaijer <info@almufaijer.com>',
          to: customerEmail,
          subject: 'تم استرداد المبلغ | Refund Processed - Souq Almufaijer',
          html: emailHtml,
        });

        console.log('Apology email sent:', emailResponse);
        emailSent = true;

        // Log to email_queue for audit
        await supabase.from('email_queue').insert({
          booking_id: null,
          email_type: 'orphan_refund_apology',
          to_email: customerEmail,
          to_name: 'Customer',
          subject: 'تم استرداد المبلغ | Refund Processed',
          body_html: emailHtml,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

      } catch (emailError) {
        console.error('Failed to send apology email:', emailError);
        // Don't fail the refund if email fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      refundedAmount: refundAmount / 100,
      currency: 'SAR',
      paymentId,
      emailSent,
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
