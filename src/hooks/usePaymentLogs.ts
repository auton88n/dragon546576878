import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface PaymentLog {
  id: string;
  booking_id: string | null;
  event_type: string;
  payment_id: string | null;
  payment_method: string | null;
  amount: number | null;
  status_before: string | null;
  status_after: string | null;
  error_message: string | null;
  changed_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  changer_name?: string;
}

export const usePaymentLogs = (bookingId: string | null) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!bookingId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for changed_by users
      const logsWithNames: PaymentLog[] = [];
      for (const log of (data || [])) {
        let changerName: string | undefined;
        if (log.changed_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', log.changed_by)
            .single();
          changerName = profile?.full_name;
        }
        logsWithNames.push({
          ...log,
          metadata: log.metadata as Record<string, unknown> | null,
          changer_name: changerName,
        });
      }

      setLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching payment logs:', error);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
};

// Helper function to log a payment event from the client
export const logPaymentEvent = async (
  bookingId: string,
  eventType: 'attempt' | 'success' | 'failure' | 'manual_update' | 'refund',
  data: {
    paymentId?: string;
    paymentMethod?: string;
    amount?: number;
    statusBefore?: string;
    statusAfter?: string;
    errorMessage?: string;
    changedBy?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  try {
    const insertData = {
      booking_id: bookingId,
      event_type: eventType,
      payment_id: data.paymentId || null,
      payment_method: data.paymentMethod || null,
      amount: data.amount || null,
      status_before: data.statusBefore || null,
      status_after: data.statusAfter || null,
      error_message: data.errorMessage || null,
      changed_by: data.changedBy || null,
      metadata: (data.metadata || null) as Json,
    };

    const { error } = await supabase
      .from('payment_logs')
      .insert([insertData]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging payment event:', error);
    return false;
  }
};
