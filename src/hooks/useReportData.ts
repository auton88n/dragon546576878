import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

export interface DailyStats {
  date: string;
  revenue: number;
  bookings: number;
  visitors: number;
}

export interface ReportData {
  dailyStats: DailyStats[];
  totalRevenue: number;
  totalBookings: number;
  totalVisitors: number;
  averageBookingValue: number;
}

export const useReportData = (days: number = 30) => {
  const [data, setData] = useState<ReportData>({
    dailyStats: [],
    totalRevenue: 0,
    totalBookings: 0,
    totalVisitors: 0,
    averageBookingValue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = format(subDays(startOfDay(new Date()), days - 1), 'yyyy-MM-dd');

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('visit_date, total_amount, adult_count, child_count, senior_count, payment_status')
        .gte('visit_date', startDate)
        .eq('payment_status', 'completed')
        .order('visit_date', { ascending: true });

      if (error) throw error;

      // Group by date
      const dailyMap = new Map<string, DailyStats>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyMap.set(date, { date, revenue: 0, bookings: 0, visitors: 0 });
      }

      // Aggregate data
      let totalRevenue = 0;
      let totalBookings = 0;
      let totalVisitors = 0;

      bookings?.forEach((booking) => {
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
      });

      const dailyStats = Array.from(dailyMap.values());
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      setData({
        dailyStats,
        totalRevenue,
        totalBookings,
        totalVisitors,
        averageBookingValue,
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
