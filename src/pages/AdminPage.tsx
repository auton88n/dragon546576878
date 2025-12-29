import { useState } from 'react';
import { LayoutDashboard, Ticket, Users, DollarSign, QrCode } from 'lucide-react';
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
import SettingsPanel from '@/components/admin/SettingsPanel';
import ReportsPanel from '@/components/admin/ReportsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

const AdminPage = () => {
  const { currentLanguage } = useLanguage();
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
      color: 'text-green-600',
      bgColor: 'bg-green-100',
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: isArabic ? 'التذاكر الممسوحة' : 'Tickets Scanned',
      value: stats.ticketsScanned,
      icon: QrCode,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isArabic ? 'لوحة التحكم' : 'Dashboard'}
                </h1>
                <p className="text-muted-foreground">
                  {isArabic ? 'إدارة الحجوزات والتذاكر' : 'Manage bookings and tickets'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/scan">
                <Button variant="outline" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  {isArabic ? 'الماسح' : 'Scanner'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <StatsCard key={index} {...stat} loading={statsLoading} />
            ))}
          </div>

          {/* Bookings Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                {isArabic ? 'إدارة الحجوزات' : 'Booking Management'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  >
                    {isArabic ? 'السابق' : 'Previous'}
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {isArabic ? 'التالي' : 'Next'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
