import { supabase } from '@/integrations/supabase/client';
import { logPaymentEvent } from '@/hooks/usePaymentLogs';

/**
 * Marks a booking as paid and triggers the full payment completion flow:
 * 1. Updates booking status to completed
 * 2. Logs the manual payment event
 * 3. Generates tickets via edge function
 * 4. Sends confirmation email with tickets
 */
export async function markBookingAsPaid(
  bookingId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        payment_method: 'manual',
        booking_status: 'confirmed',
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Step 2: Log the manual payment event
    await logPaymentEvent(bookingId, 'manual_update', {
      statusBefore: 'pending',
      statusAfter: 'completed',
      changedBy: userId,
      paymentMethod: 'manual',
    });

    // Step 3: Generate tickets via edge function
    const { error: ticketError } = await supabase.functions.invoke('generate-tickets', {
      body: { bookingId },
    });

    if (ticketError) {
      console.error('Error generating tickets:', ticketError);
      // Don't fail completely - tickets can be regenerated
    }

    // Step 4: Send confirmation email with tickets
    const { error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { bookingId },
    });

    if (emailError) {
      console.error('Error sending confirmation:', emailError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking booking as paid:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Regenerates tickets for a paid booking that is missing tickets
 */
export async function regenerateTickets(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('generate-tickets', {
      body: { bookingId },
    });

    if (error) throw error;

    // Also resend confirmation email with the new tickets
    await supabase.functions.invoke('send-booking-confirmation', {
      body: { bookingId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error regenerating tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
