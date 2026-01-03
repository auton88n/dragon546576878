import { supabase } from '@/integrations/supabase/client';

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (bookingId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
      body: { bookingId },
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }

    console.log('Confirmation email sent:', data);
    return data?.success ?? false;
  } catch (error) {
    console.error('Error invoking email function:', error);
    return false;
  }
};

/**
 * Check if confirmation email was sent for a booking
 */
export const checkEmailStatus = async (bookingId: string): Promise<{
  sent: boolean;
  sentAt: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('confirmation_email_sent')
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      return { sent: false, sentAt: null };
    }

    // If sent, get the sent timestamp from email queue
    if (data.confirmation_email_sent) {
      const { data: emailData } = await supabase
        .from('email_queue')
        .select('sent_at')
        .eq('booking_id', bookingId)
        .eq('email_type', 'booking_confirmation')
        .eq('status', 'sent')
        .single();

      return {
        sent: true,
        sentAt: emailData?.sent_at ?? null,
      };
    }

    return { sent: false, sentAt: null };
  } catch (error) {
    console.error('Error checking email status:', error);
    return { sent: false, sentAt: null };
  }
};

/**
 * Resend confirmation email (for admin use)
 */
export const resendConfirmationEmail = async (bookingId: string): Promise<boolean> => {
  return sendBookingConfirmation(bookingId);
};

/**
 * Send payment reminder email
 */
export const sendPaymentReminder = async (bookingId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
      body: { bookingId },
    });

    if (error) {
      console.error('Error sending payment reminder:', error);
      return false;
    }

    console.log('Payment reminder sent:', data);
    return data?.success ?? false;
  } catch (error) {
    console.error('Error invoking payment reminder function:', error);
    return false;
  }
};
