import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

export interface BookingFilters {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  hideAbandoned: boolean;
}

const THROTTLE_MS = 5000; // Increased to 5 seconds for less frequent updates
const DEBOUNCE_MS = 300; // Debounce for filter changes

// Debounce hook for search/filter inputs
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

export const useBookings = (filters: BookingFilters, page: number = 1, pageSize: number = 20) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  
  // Debounce the search filter to prevent rapid queries
  const debouncedSearch = useDebounce(filters.search, DEBOUNCE_MS);
  
  // Create stable filter reference with debounced search
  const stableFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo, filters.hideAbandoned, debouncedSearch]);

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

      // Hide abandoned bookings (older than 7 days, still pending payment)
      if (filters.hideAbandoned) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString();
        // Abandoned = pending payment AND older than 7 days
        // Show bookings that are: paid OR created within last 7 days
        // Using filter to properly negate the condition
        query = query.or(`payment_status.neq.pending,created_at.gte.${cutoffDate}`);
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
  }, [stableFilters, page, pageSize]);

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
