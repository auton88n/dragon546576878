import { useState, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { TrendingUp, Users, DollarSign, Calendar, BarChart3, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PAYMENT_COLORS = {
  creditcard: 'hsl(var(--accent))',
  applepay: 'hsl(210 100% 50%)',
  stcpay: 'hsl(280 80% 55%)',
  mada: 'hsl(150 70% 45%)',
  unknown: 'hsl(var(--muted-foreground))',
};

const STATUS_COLORS = {
  completed: 'hsl(142 76% 36%)',
  pending: 'hsl(45 93% 47%)',
  failed: 'hsl(0 84% 60%)',
};

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

  const paymentMethodLabels: Record<string, { en: string; ar: string }> = {
    creditcard: { en: 'Credit Card', ar: 'بطاقة ائتمان' },
    applepay: { en: 'Apple Pay', ar: 'أبل باي' },
    stcpay: { en: 'STC Pay', ar: 'إس تي سي باي' },
    mada: { en: 'Mada', ar: 'مدى' },
    unknown: { en: 'Unknown', ar: 'غير معروف' },
  };

  const paymentMethodData = useMemo(() => 
    data.paymentMethods.map((pm) => ({
      name: paymentMethodLabels[pm.method]?.[isArabic ? 'ar' : 'en'] || pm.method,
      value: pm.count,
      amount: pm.amount,
      method: pm.method,
    })),
    [data.paymentMethods, isArabic]
  );

  const totalPayments = data.paymentStatus.completed + data.paymentStatus.pending + data.paymentStatus.failed;
  const successRate = totalPayments > 0 ? ((data.paymentStatus.completed / totalPayments) * 100).toFixed(1) : '0';

  const paymentStatusData = useMemo(() => [
    { name: isArabic ? 'مكتمل' : 'Completed', value: data.paymentStatus.completed, status: 'completed' },
    { name: isArabic ? 'معلق' : 'Pending', value: data.paymentStatus.pending, status: 'pending' },
    { name: isArabic ? 'فاشل' : 'Failed', value: data.paymentStatus.failed, status: 'failed' },
  ].filter(item => item.value > 0), [data.paymentStatus, isArabic]);

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
      title: isArabic ? 'معدل النجاح' : 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle,
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
      <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent rtl:bg-gradient-to-l p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-start rtl:text-right">
            <CardTitle className="flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end text-base md:text-lg">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              </div>
              {isArabic ? 'التقارير والإحصائيات' : 'Reports & Analytics'}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {isArabic ? 'عرض اتجاهات الإيرادات وإحصائيات الزوار' : 'View revenue trends and visitor statistics'}
            </CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
            <TabsList className="bg-background/50 border border-accent/20">
              <TabsTrigger value="7" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs md:text-sm px-2 md:px-3">
                {isArabic ? '7 أيام' : '7 Days'}
              </TabsTrigger>
              <TabsTrigger value="30" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs md:text-sm px-2 md:px-3">
                {isArabic ? '30 يوم' : '30 Days'}
              </TabsTrigger>
              <TabsTrigger value="90" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs md:text-sm px-2 md:px-3">
                {isArabic ? '90 يوم' : '90 Days'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-8 p-4 md:p-6 pt-4 md:pt-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 rtl:[direction:rtl]">
          {summaryCards.map((card, index) => (
            <div
              key={index}
              className={`rounded-xl p-3 md:p-4 bg-gradient-to-br rtl:bg-gradient-to-bl ${card.gradient} border border-accent/10 transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 rtl:flex-row-reverse">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mb-1 text-start">{card.title}</p>
              <p className="text-lg md:text-xl font-bold text-foreground text-start">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Payment Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Payment Success Rate */}
          <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
            <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
              </div>
              {isArabic ? 'معدل نجاح المدفوعات' : 'Payment Success Rate'}
            </h3>
            <div className="h-48 md:h-56">
              {paymentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--accent) / 0.2)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [value, isArabic ? 'العدد' : 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {isArabic ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.completed }} />
                <span className="text-xs text-muted-foreground">{isArabic ? 'مكتمل' : 'Completed'}</span>
              </div>
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.pending }} />
                <span className="text-xs text-muted-foreground">{isArabic ? 'معلق' : 'Pending'}</span>
              </div>
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.failed }} />
                <span className="text-xs text-muted-foreground">{isArabic ? 'فاشل' : 'Failed'}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
            <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
              </div>
              {isArabic ? 'طرق الدفع' : 'Payment Methods'}
            </h3>
            <div className="h-48 md:h-56">
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PAYMENT_COLORS[entry.method as keyof typeof PAYMENT_COLORS] || PAYMENT_COLORS.unknown} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--accent) / 0.2)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number, name: string, props: { payload: { amount: number } }) => [
                        `${value} (${props.payload.amount.toLocaleString()} SAR)`,
                        isArabic ? 'الحجوزات' : 'Bookings'
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {isArabic ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {paymentMethodData.map((pm, index) => (
                <div key={index} className="flex items-center gap-2 rtl:flex-row-reverse">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PAYMENT_COLORS[pm.method as keyof typeof PAYMENT_COLORS] || PAYMENT_COLORS.unknown }} 
                  />
                  <span className="text-xs text-muted-foreground">{pm.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
          <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
            </div>
            {isArabic ? 'اتجاه الإيرادات' : 'Revenue Trend'}
          </h3>
          <div className="h-56 md:h-72">
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
                  reversed={isArabic}
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
                <Legend wrapperStyle={{ direction: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }} />
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
        <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
          <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
            </div>
            {isArabic ? 'الزوار والحجوزات' : 'Visitors & Bookings'}
          </h3>
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--accent) / 0.1)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  reversed={isArabic}
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
                  <Legend wrapperStyle={{ direction: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }} />
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
