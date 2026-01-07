import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

export interface DailyStats {
  date: string;
  revenue: number;
  bookings: number;
  visitors: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
}

export interface PaymentStatusStats {
  completed: number;
  pending: number;
  failed: number;
}

export interface ReportData {
  dailyStats: DailyStats[];
  totalRevenue: number;
  totalBookings: number;
  totalVisitors: number;
  averageBookingValue: number;
  paymentMethods: PaymentMethodStats[];
  paymentStatus: PaymentStatusStats;
}

export const useReportData = (days: number = 30) => {
  const [data, setData] = useState<ReportData>({
    dailyStats: [],
    totalRevenue: 0,
    totalBookings: 0,
    totalVisitors: 0,
    averageBookingValue: 0,
    paymentMethods: [],
    paymentStatus: { completed: 0, pending: 0, failed: 0 },
  });
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = format(subDays(startOfDay(new Date()), days - 1), 'yyyy-MM-dd');

      // Fetch completed bookings for revenue stats
      const { data: completedBookings, error: completedError } = await supabase
        .from('bookings')
        .select('visit_date, total_amount, adult_count, child_count, senior_count, payment_method')
        .gte('visit_date', startDate)
        .eq('booking_status', 'confirmed')
        .eq('payment_status', 'completed')
        .order('visit_date', { ascending: true });

      if (completedError) throw completedError;

      // Fetch all bookings for payment status breakdown
      const { data: allBookings, error: allError } = await supabase
        .from('bookings')
        .select('payment_status, payment_method, total_amount')
        .gte('created_at', startDate);

      if (allError) throw allError;

      // Group by date
      const dailyMap = new Map<string, DailyStats>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyMap.set(date, { date, revenue: 0, bookings: 0, visitors: 0 });
      }

      // Aggregate completed bookings data
      let totalRevenue = 0;
      let totalBookings = 0;
      let totalVisitors = 0;
      const methodMap = new Map<string, { count: number; amount: number }>();

      completedBookings?.forEach((booking) => {
        const date = booking.visit_date;
        const existing = dailyMap.get(date) || { date, revenue: 0, bookings: 0, visitors: 0 };
        const visitors = (booking.adult_count || 0) + (booking.child_count || 0) + (booking.senior_count || 0);

        existing.revenue += Number(booking.total_amount);
        existing.bookings += 1;
        existing.visitors += visitors;

        dailyMap.set(date, existing);

        totalRevenue += Number(booking.total_amount);
        totalBookings += 1;
        totalVisitors += visitors;

        // Track payment methods
        const method = booking.payment_method || 'unknown';
        const methodStats = methodMap.get(method) || { count: 0, amount: 0 };
        methodStats.count += 1;
        methodStats.amount += Number(booking.total_amount);
        methodMap.set(method, methodStats);
      });

      // Calculate payment status breakdown
      const paymentStatus: PaymentStatusStats = { completed: 0, pending: 0, failed: 0 };
      allBookings?.forEach((booking) => {
        if (booking.payment_status === 'completed') paymentStatus.completed++;
        else if (booking.payment_status === 'pending') paymentStatus.pending++;
        else if (booking.payment_status === 'failed') paymentStatus.failed++;
      });

      const paymentMethods: PaymentMethodStats[] = Array.from(methodMap.entries()).map(([method, stats]) => ({
        method,
        count: stats.count,
        amount: stats.amount,
      }));

      const dailyStats = Array.from(dailyMap.values());
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      setData({
        dailyStats,
        totalRevenue,
        totalBookings,
        totalVisitors,
        averageBookingValue,
        paymentMethods,
        paymentStatus,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [days]);

  return { data, loading, refetch: fetchReportData };
};
