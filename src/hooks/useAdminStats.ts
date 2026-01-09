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
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  duplicateBookingsCount: number;
}

const DEFAULT_STATS: AdminStats = {
  totalRevenue: 0,
  todayBookings: 0,
  todayVisitors: 0,
  ticketsScanned: 0,
  totalBookings: 0,
  pendingEmails: 0,
  todayScans: 0,
  pendingPaymentsCount: 0,
  pendingPaymentsAmount: 0,
  duplicateBookingsCount: 0,
};

const fetchAdminStats = async (): Promise<AdminStats> => {
  // Get today's date in Saudi Arabia timezone (UTC+3)
  const getSaudiDate = () => {
    const now = new Date();
    const saudiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    return saudiTime.toISOString().split('T')[0];
  };
  const today = getSaudiDate();

  const startOfDay = `${today}T00:00:00+03:00`;
  const endOfDay = `${today}T23:59:59+03:00`;

  const [
    { data: allBookings, count: totalBookingsCount },
    { data: todayBookingsData },
    { count: scannedTicketsCount },
    { count: pendingEmailsCount },
    { count: todayScansCount },
    { data: pendingPaymentsData, count: pendingPaymentsCount },
    { data: pendingForDuplicates },
  ] = await Promise.all([
    // Total revenue with explicit limit to avoid 1000 row cap
    supabase
      .from('bookings')
      .select('total_amount', { count: 'exact' })
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'completed')
      .limit(10000),
    // Today's bookings
    supabase
      .from('bookings')
      .select('adult_count, child_count, senior_count')
      .eq('visit_date', today)
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'completed'),
    // Scanned tickets - use count for efficiency
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('is_used', true),
    // Pending emails - use count
    supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Today's scans
    supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true })
      .gte('scan_timestamp', startOfDay)
      .lte('scan_timestamp', endOfDay),
    // Pending payments
    supabase
      .from('bookings')
      .select('total_amount', { count: 'exact' })
      .eq('payment_status', 'pending'),
    // Pending bookings for duplicate detection
    supabase
      .from('bookings')
      .select('customer_email, visit_date')
      .eq('payment_status', 'pending'),
  ]);

  // Calculate duplicate bookings count
  const duplicateGroups: Record<string, number> = {};
  (pendingForDuplicates || []).forEach((b) => {
    const key = `${b.customer_email}|${b.visit_date}`;
    duplicateGroups[key] = (duplicateGroups[key] || 0) + 1;
  });
  const duplicateBookingsCount = Object.values(duplicateGroups).filter(count => count >= 2).length;

  const totalRevenue = allBookings?.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0) || 0;
  const todayVisitors = todayBookingsData?.reduce(
    (sum, b) => 
      sum + Number(b.adult_count ?? 0) + Number(b.child_count ?? 0) + Number(b.senior_count ?? 0),
    0
  ) || 0;
  const pendingPaymentsAmount = pendingPaymentsData?.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0) || 0;

  return {
    totalRevenue,
    todayBookings: todayBookingsData?.length || 0,
    todayVisitors,
    ticketsScanned: scannedTicketsCount || 0,
    totalBookings: totalBookingsCount || 0,
    pendingEmails: pendingEmailsCount || 0,
    todayScans: todayScansCount || 0,
    pendingPaymentsCount: pendingPaymentsCount || 0,
    pendingPaymentsAmount,
    duplicateBookingsCount,
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
