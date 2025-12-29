import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalRevenue: number;
  todayBookings: number;
  todayVisitors: number;
  ticketsScanned: number;
  totalBookings: number;
  pendingEmails: number;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 0,
    todayBookings: 0,
    todayVisitors: 0,
    ticketsScanned: 0,
    totalBookings: 0,
    pendingEmails: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all stats in parallel
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

      // Calculate total revenue
      const totalRevenue = allBookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      // Calculate today's visitors
      const todayVisitors = todayBookingsData?.reduce(
        (sum, b) => sum + (b.adult_count || 0) + (b.child_count || 0) + (b.senior_count || 0),
        0
      ) || 0;

      setStats({
        totalRevenue,
        todayBookings: todayBookingsData?.length || 0,
        todayVisitors,
        ticketsScanned: scannedTickets?.length || 0,
        totalBookings: allBookings?.length || 0,
        pendingEmails: pendingEmails?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for bookings
    const channel = supabase
      .channel('admin-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading, refetch: fetchStats };
};
