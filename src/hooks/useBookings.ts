import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

export interface BookingFilters {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

const THROTTLE_MS = 2000;

export const useBookings = (filters: BookingFilters, page: number = 1, pageSize: number = 20) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `booking_reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`
        );
      }

      // Apply booking status filter
      if (filters.status && filters.status !== 'all') {
        query = query.eq('booking_status', filters.status);
      }

      // Apply payment status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('visit_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('visit_date', filters.dateTo);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setBookings(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const throttledFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current > THROTTLE_MS) {
      lastFetchRef.current = now;
      fetchBookings();
    }
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time updates with throttle
  useEffect(() => {
    const channel = supabase
      .channel('bookings-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        throttledFetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledFetch]);

  return {
    bookings,
    totalCount,
    loading,
    refetch: fetchBookings,
    totalPages: Math.ceil(totalCount / pageSize),
  };
};
