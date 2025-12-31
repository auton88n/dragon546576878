import { useState, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { TrendingUp, Users, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useReportData } from '@/hooks/useReportData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const chartData = useMemo(() => 
    data.dailyStats.map((stat) => ({
      ...stat,
      dateLabel: formatDate(stat.date),
    })),
    [data.dailyStats, isArabic]
  );

  const summaryCards = [
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: `${data.totalRevenue.toLocaleString()} ${isArabic ? 'ر.س' : 'SAR'}`,
      icon: DollarSign,
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-600',
    },
    {
      title: isArabic ? 'إجمالي الحجوزات' : 'Total Bookings',
      value: data.totalBookings.toLocaleString(),
      icon: Calendar,
      gradient: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600',
    },
    {
      title: isArabic ? 'إجمالي الزوار' : 'Total Visitors',
      value: data.totalVisitors.toLocaleString(),
      icon: Users,
      gradient: 'from-purple-500/20 to-purple-500/5',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-600',
    },
    {
      title: isArabic ? 'متوسط قيمة الحجز' : 'Avg. Booking Value',
      value: `${Math.round(data.averageBookingValue).toLocaleString()} ${isArabic ? 'ر.س' : 'SAR'}`,
      icon: TrendingUp,
      gradient: 'from-accent/20 to-accent/5',
      iconBg: 'bg-accent/20',
      iconColor: 'text-accent',
    },
  ];

  if (loading) {
    return (
      <Card className="glass-card border-accent/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-accent/10" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full bg-accent/10" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-accent/20 overflow-hidden">
      <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              {isArabic ? 'التقارير والإحصائيات' : 'Reports & Analytics'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isArabic ? 'عرض اتجاهات الإيرادات وإحصائيات الزوار' : 'View revenue trends and visitor statistics'}
            </CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
            <TabsList className="bg-background/50 border border-accent/20">
              <TabsTrigger value="7" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {isArabic ? '7 أيام' : '7 Days'}
              </TabsTrigger>
              <TabsTrigger value="30" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {isArabic ? '30 يوم' : '30 Days'}
              </TabsTrigger>
              <TabsTrigger value="90" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {isArabic ? '90 يوم' : '90 Days'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 bg-gradient-to-br ${card.gradient} border border-accent/10 transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-6 border border-accent/10">
          <h3 className="font-semibold mb-6 flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
            {isArabic ? 'اتجاه الإيرادات' : 'Revenue Trend'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--accent) / 0.1)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--accent) / 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px hsl(var(--accent) / 0.2)',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} SAR`, isArabic ? 'الإيرادات' : 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--accent))"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visitors Chart */}
        <div className="glass-card rounded-xl p-6 border border-accent/10">
          <h3 className="font-semibold mb-6 flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            {isArabic ? 'الزوار والحجوزات' : 'Visitors & Bookings'}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--accent) / 0.1)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--accent) / 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px hsl(var(--accent) / 0.2)',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="visitors"
                  name={isArabic ? 'الزوار' : 'Visitors'}
                  fill="hsl(var(--accent))"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="bookings"
                  name={isArabic ? 'الحجوزات' : 'Bookings'}
                  fill="hsl(var(--accent) / 0.4)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(ReportsPanel);
