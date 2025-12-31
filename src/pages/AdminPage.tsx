import { useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Ticket, Users, DollarSign, QrCode, BarChart3, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useBookings } from '@/hooks/useBookings';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import StatsCard from '@/components/admin/StatsCard';
import BookingTable from '@/components/admin/BookingTable';
import BookingFilters from '@/components/admin/BookingFilters';
import BookingDetailsDialog from '@/components/admin/BookingDetailsDialog';
import { Skeleton } from '@/components/ui/skeleton';

const SettingsPanel = lazy(() => import('@/components/admin/SettingsPanel'));
const ReportsPanel = lazy(() => import('@/components/admin/ReportsPanel'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

const AdminPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { stats, loading: statsLoading } = useAdminStats();
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const { bookings, loading: bookingsLoading, totalPages } = useBookings(filters, page);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const statsCards = [
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: stats.totalRevenue,
      suffix: isArabic ? 'ر.س' : 'SAR',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'gradient-gold',
    },
    {
      title: isArabic ? 'الحجوزات اليوم' : "Today's Bookings",
      value: stats.todayBookings,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: isArabic ? 'الزوار اليوم' : "Today's Visitors",
      value: stats.todayVisitors,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: isArabic ? 'التذاكر الممسوحة' : 'Tickets Scanned',
      value: stats.ticketsScanned,
      icon: QrCode,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-6 md:pb-8 px-4 md:px-6">
        <div className="container px-0">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl gradient-gold flex items-center justify-center glow-gold flex-shrink-0">
                <span className="icon-wrapper">
                  <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7 text-foreground" aria-hidden="true" />
                </span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {isArabic ? 'إدارة الحجوزات والتذاكر' : 'Manage bookings and tickets'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <Link to="/scan">
                <Button className="btn-gold gap-2 text-sm md:text-base px-3 md:px-4">
                  <span className="icon-wrapper">
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="hidden sm:inline">{isArabic ? 'الماسح' : 'Scanner'}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            {statsCards.map((stat, index) => (
              <StatsCard key={index} {...stat} loading={statsLoading} />
            ))}
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="bookings" className="space-y-4 md:space-y-6" activationMode="manual">
            <TabsList className="glass-card-gold p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="bookings" 
                className="gap-1.5 md:gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm"
              >
                <span className="icon-wrapper">
                  <Ticket className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                </span>
                {isArabic ? 'الحجوزات' : 'Bookings'}
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="gap-1.5 md:gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm"
              >
                <span className="icon-wrapper">
                  <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                </span>
                {isArabic ? 'التقارير' : 'Reports'}
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="gap-1.5 md:gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm"
              >
                <span className="icon-wrapper">
                  <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                </span>
                {isArabic ? 'الإعدادات' : 'Settings'}
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="animate-fade-in">
              <Card className="glass-card-gold border-0">
                <CardHeader className="border-b border-border/50 p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                      <span className="icon-wrapper">
                        <Ticket className="h-4 w-4 md:h-5 md:w-5 text-foreground" aria-hidden="true" />
                      </span>
                    </div>
                    <span className="text-foreground">
                      {isArabic ? 'إدارة الحجوزات' : 'Booking Management'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <BookingFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onReset={handleResetFilters}
                  />
                  
                  <BookingTable
                    bookings={bookings}
                    loading={bookingsLoading}
                    onViewDetails={handleViewDetails}
                  />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-accent/30 hover:bg-accent/5"
                      >
                        {isArabic ? 'السابق' : 'Previous'}
                      </Button>
                      <span className="flex items-center px-4 text-sm text-muted-foreground glass-card rounded-lg">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-accent/30 hover:bg-accent/5"
                      >
                        {isArabic ? 'التالي' : 'Next'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="animate-fade-in">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ReportsPanel />
              </Suspense>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="animate-fade-in">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <SettingsPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      <BookingDetailsDialog
        booking={selectedBooking}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default AdminPage;