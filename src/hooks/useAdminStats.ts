import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalRevenue: number;
  todayBookings: number;
  todayVisitors: number;
  ticketsScanned: number;
  totalBookings: number;
  pendingEmails: number;
  todayScans: number;
}

const DEFAULT_STATS: AdminStats = {
  totalRevenue: 0,
  todayBookings: 0,
  todayVisitors: 0,
  ticketsScanned: 0,
  totalBookings: 0,
  pendingEmails: 0,
  todayScans: 0,
};

const fetchAdminStats = async (): Promise<AdminStats> => {
  const today = new Date().toISOString().split('T')[0];

  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const [
    { data: allBookings },
    { data: todayBookingsData },
    { data: scannedTickets },
    { data: pendingEmails },
    { count: todayScansCount },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('total_amount, adult_count, child_count, senior_count')
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'completed'),
    supabase
      .from('bookings')
      .select('adult_count, child_count, senior_count')
      .eq('visit_date', today)
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'completed'),
    supabase
      .from('tickets')
      .select('id')
      .eq('is_used', true),
    supabase
      .from('email_queue')
      .select('id')
      .eq('status', 'pending'),
    supabase
      .from('scan_logs')
      .select('id', { count: 'exact', head: true })
      .gte('scan_timestamp', startOfDay)
      .lte('scan_timestamp', endOfDay),
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
    todayScans: todayScansCount || 0,
  };
};

export const useAdminStats = () => {
  const lastFetchRef = useRef<number>(0);

  const queryResult = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    staleTime: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { refetch } = queryResult;

  const throttledRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current > 2000) {
      lastFetchRef.current = now;
      refetch();
    }
  }, [refetch]);

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        throttledRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledRefetch]);

  return {
    stats: queryResult.data ?? DEFAULT_STATS,
    loading: queryResult.isLoading,
    refetch,
  };
};
