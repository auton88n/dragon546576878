import { useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { TrendingUp, Users, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useReportData } from '@/hooks/useReportData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ReportsPanel = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const { data, loading } = useReportData(Number(period));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'MMM d', { locale: isArabic ? ar : enUS });
  };

  const chartData = data.dailyStats.map((stat) => ({
    ...stat,
    dateLabel: formatDate(stat.date),
  }));

  const summaryCards = [
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: `${data.totalRevenue.toLocaleString()} ${isArabic ? 'ر.س' : 'SAR'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: isArabic ? 'إجمالي الحجوزات' : 'Total Bookings',
      value: data.totalBookings.toLocaleString(),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: isArabic ? 'إجمالي الزوار' : 'Total Visitors',
      value: data.totalVisitors.toLocaleString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: isArabic ? 'متوسط قيمة الحجز' : 'Avg. Booking Value',
      value: `${Math.round(data.averageBookingValue).toLocaleString()} ${isArabic ? 'ر.س' : 'SAR'}`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {isArabic ? 'التقارير والإحصائيات' : 'Reports & Analytics'}
            </CardTitle>
            <CardDescription>
              {isArabic ? 'عرض اتجاهات الإيرادات وإحصائيات الزوار' : 'View revenue trends and visitor statistics'}
            </CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
            <TabsList>
              <TabsTrigger value="7">{isArabic ? '7 أيام' : '7 Days'}</TabsTrigger>
              <TabsTrigger value="30">{isArabic ? '30 يوم' : '30 Days'}</TabsTrigger>
              <TabsTrigger value="90">{isArabic ? '90 يوم' : '90 Days'}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <div
              key={index}
              className="bg-muted/50 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <span className="text-sm text-muted-foreground">{card.title}</span>
              </div>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {isArabic ? 'اتجاه الإيرادات' : 'Revenue Trend'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} SAR`, isArabic ? 'الإيرادات' : 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visitors Chart */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isArabic ? 'الزوار والحجوزات' : 'Visitors & Bookings'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="visitors"
                  name={isArabic ? 'الزوار' : 'Visitors'}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="bookings"
                  name={isArabic ? 'الحجوزات' : 'Bookings'}
                  fill="hsl(var(--primary) / 0.5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsPanel;
