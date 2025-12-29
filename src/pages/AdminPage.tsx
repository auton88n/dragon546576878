import { LayoutDashboard, Ticket, Users, Calendar, DollarSign, TrendingUp, Settings, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AdminPage = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  // Placeholder stats
  const stats = [
    {
      titleAr: 'إجمالي الإيرادات',
      titleEn: 'Total Revenue',
      value: '0',
      suffix: isArabic ? 'ر.س' : 'SAR',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      titleAr: 'الحجوزات اليوم',
      titleEn: "Today's Bookings",
      value: '0',
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      titleAr: 'الزوار اليوم',
      titleEn: "Today's Visitors",
      value: '0',
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      titleAr: 'التذاكر الممسوحة',
      titleEn: 'Tickets Scanned',
      value: '0',
      icon: QrCode,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const quickActions = [
    {
      titleAr: 'عرض الحجوزات',
      titleEn: 'View Bookings',
      icon: Ticket,
      href: '#',
    },
    {
      titleAr: 'ماسح التذاكر',
      titleEn: 'Ticket Scanner',
      icon: QrCode,
      href: '/scan',
    },
    {
      titleAr: 'التقارير',
      titleEn: 'Reports',
      icon: TrendingUp,
      href: '#',
    },
    {
      titleAr: 'الإعدادات',
      titleEn: 'Settings',
      icon: Settings,
      href: '#',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-muted-foreground">
                  {isArabic ? 'مرحباً بك في لوحة تحكم سوق المفيجر' : 'Welcome to Souq Almufaijer Dashboard'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {isArabic ? stat.titleAr : stat.titleEn}
                      </p>
                      <p className="text-3xl font-bold">
                        {stat.value}
                        {stat.suffix && (
                          <span className="text-lg text-muted-foreground mr-1 rtl:ml-1 rtl:mr-0">
                            {stat.suffix}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isArabic ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <Link key={index} to={action.href}>
                    <Button
                      variant="outline"
                      className="w-full h-24 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
                    >
                      <action.icon className="h-6 w-6 text-primary" />
                      <span>{isArabic ? action.titleAr : action.titleEn}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Placeholder Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  {isArabic ? 'آخر الحجوزات' : 'Recent Bookings'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{isArabic ? 'لا توجد حجوزات بعد' : 'No bookings yet'}</p>
                  <p className="text-sm mt-2">
                    {isArabic ? '🚧 قيد التطوير' : '🚧 Under development'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Visits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {isArabic ? 'الزيارات القادمة' : 'Upcoming Visits'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{isArabic ? 'لا توجد زيارات قادمة' : 'No upcoming visits'}</p>
                  <p className="text-sm mt-2">
                    {isArabic ? '🚧 قيد التطوير' : '🚧 Under development'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Development Notice */}
          <div className="mt-8 p-4 bg-warning/10 border border-warning/20 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? '⚠️ لوحة التحكم قيد التطوير - سيتم إضافة المزيد من الميزات قريباً'
                : '⚠️ Dashboard is under development - More features coming soon'}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminPage;
