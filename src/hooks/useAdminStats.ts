import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalRevenue: number;
  todayBookings: number;
  todayVisitors: number;
  ticketsScanned: number;
  totalBookings: number;
  pendingEmails: number;
}

const THROTTLE_MS = 2000;

const fetchAdminStats = async (): Promise<AdminStats> => {
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: allBookings },
    { data: todayBookingsData },
    { data: scannedTickets },
    { data: pendingEmails },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_amount, adult_count, child_count, senior_count')
      .eq('payment_status', 'completed'),
    supabase
      .from('bookings')
      .select('adult_count, child_count, senior_count')
      .eq('visit_date', today)
      .eq('payment_status', 'completed'),
    supabase
      .from('tickets')
      .select('id')
      .eq('is_used', true),
    supabase
      .from('email_queue')
      .select('id')
      .eq('status', 'pending'),
  ]);

  const totalRevenue = allBookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
  const todayVisitors = todayBookingsData?.reduce(
    (sum, b) => sum + (b.adult_count || 0) + (b.child_count || 0) + (b.senior_count || 0),
    0
  ) || 0;

  return {
    totalRevenue,
    todayBookings: todayBookingsData?.length || 0,
    todayVisitors,
    ticketsScanned: scannedTickets?.length || 0,
    totalBookings: allBookings?.length || 0,
    pendingEmails: pendingEmails?.length || 0,
  };
};

export const useAdminStats = () => {
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);

  const { data: stats, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const throttledRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current > THROTTLE_MS) {
      lastFetchRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        throttledRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        throttledRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledRefetch]);

  return {
    stats: stats || {
      totalRevenue: 0,
      todayBookings: 0,
      todayVisitors: 0,
      ticketsScanned: 0,
      totalBookings: 0,
      pendingEmails: 0,
    },
    loading,
    refetch,
  };
};
