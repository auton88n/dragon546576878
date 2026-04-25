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
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);

  // Debounce the search filter to prevent rapid queries
  const debouncedSearch = useDebounce(filters.search, DEBOUNCE_MS);

  // Create stable filter reference with debounced search
  const stableFilters = useMemo(() => ({
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    hideAbandoned: filters.hideAbandoned,
    search: debouncedSearch,
  }), [filters.status, filters.paymentStatus, filters.dateFrom, filters.dateTo, filters.hideAbandoned, debouncedSearch]);

  const fetchBookings = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter (use debounced value)
      if (stableFilters.search) {
        const safe = stableFilters.search.replace(/[%,()]/g, '');
        query = query.or(
          `booking_reference.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`
        );
      }

      if (stableFilters.status && stableFilters.status !== 'all') {
        query = query.eq('booking_status', stableFilters.status);
      }

      if (stableFilters.paymentStatus && stableFilters.paymentStatus !== 'all') {
        query = query.eq('payment_status', stableFilters.paymentStatus);
      }

      if (stableFilters.dateFrom) {
        query = query.gte('visit_date', stableFilters.dateFrom);
      }
      if (stableFilters.dateTo) {
        query = query.lte('visit_date', stableFilters.dateTo);
      }

      if (stableFilters.hideAbandoned) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString();
        query = query.or(`payment_status.neq.pending,created_at.gte.${cutoffDate}`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: qErr, count } = await query;

      // Drop stale responses
      if (reqId !== requestIdRef.current) return;

      if (qErr) throw qErr;

      setBookings(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
      setBookings([]);
      setTotalCount(0);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
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
