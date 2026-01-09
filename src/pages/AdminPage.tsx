import { useState, lazy, Suspense } from 'react';
import { Ticket, Users, DollarSign, QrCode, BarChart3, Settings, Building2, Mail, Headset, Bell, Send, Eye, RefreshCw, Undo2, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useBookings } from '@/hooks/useBookings';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, exportToExcel } from '@/lib/exportBookings';
import { sendConsolidatedReminder } from '@/lib/emailService';
import { supabase } from '@/integrations/supabase/client';
import StaffHeader from '@/components/shared/StaffHeader';
import { cn } from '@/lib/utils';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import StatsCard from '@/components/admin/StatsCard';
import BookingTable from '@/components/admin/BookingTable';
import BookingFilters from '@/components/admin/BookingFilters';
import BookingDetailsDialog from '@/components/admin/BookingDetailsDialog';
import EditBookingDialog from '@/components/admin/EditBookingDialog';
import BulkActionsBar from '@/components/admin/BulkActionsBar';
import StatusLegend from '@/components/admin/StatusLegend';
import EmailPreviewDialog from '@/components/admin/EmailPreviewDialog';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load non-critical components

const SettingsPanel = lazy(() => import('@/components/admin/SettingsPanel'));
const ReportsPanel = lazy(() => import('@/components/admin/ReportsPanel'));
const GroupBookingsPanel = lazy(() => import('@/components/admin/GroupBookingsPanel'));
const ContactSubmissionsPanel = lazy(() => import('@/components/admin/ContactSubmissionsPanel'));
const AYNSupportPanel = lazy(() => import('@/components/admin/AYNSupportPanel'));
const RefundsPanel = lazy(() => import('@/components/admin/RefundsPanel'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

const AdminPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const { stats, loading: statsLoading } = useAdminStats();
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: '',
    hideAbandoned: true,
  });
  const [page, setPage] = useState(1);
  const { bookings, loading: bookingsLoading, totalPages, refetch } = useBookings(filters, page);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditBooking(booking);
    setEditOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', status: 'all', paymentStatus: 'all', dateFrom: '', dateTo: '', hideAbandoned: true });
    setPage(1);
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      // Export either selected bookings or all filtered bookings
      const dataToExport = selectedIds.length > 0 
        ? bookings.filter(b => selectedIds.includes(b.id))
        : bookings;
      
      if (format === 'csv') {
        exportToCSV(dataToExport, 'souq-almufaijer-bookings');
      } else {
        exportToExcel(dataToExport, 'souq-almufaijer-bookings');
      }
      
      toast({
        title: isArabic ? 'تم التصدير' : 'Exported',
        description: isArabic 
          ? `تم تصدير ${dataToExport.length} حجز` 
          : `Exported ${dataToExport.length} booking(s)`,
      });
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل التصدير' : 'Export failed',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleBookingUpdated = () => {
    refetch();
    setSelectedIds([]);
  };

  const handleSendAllReminders = async () => {
    if (sendingReminders) return;
    
    setSendingReminders(true);
    try {
      // Fetch all pending payment bookings
      const { data: pendingBookings, error } = await supabase
        .from('bookings')
        .select('id, customer_email')
        .eq('payment_status', 'pending');

      if (error) throw error;

      if (!pendingBookings || pendingBookings.length === 0) {
        toast({
          title: isArabic ? 'لا توجد حجوزات معلقة' : 'No Pending Bookings',
          description: isArabic ? 'جميع الحجوزات تم دفعها' : 'All bookings have been paid',
        });
        return;
      }

      // Group by unique customer emails to avoid duplicate emails
      const uniqueEmails = [...new Set(pendingBookings.map(b => b.customer_email))];
      
      let successCount = 0;
      let totalBookingsUpdated = 0;
      let failCount = 0;

      // Send ONE consolidated reminder per customer
      for (const email of uniqueEmails) {
        const result = await sendConsolidatedReminder(email);
        if (result.success) {
          successCount++;
          totalBookingsUpdated += result.bookingsCount || 1;
        } else {
          failCount++;
        }
      }

      toast({
        title: isArabic ? 'تم إرسال التذكيرات' : 'Reminders Sent',
        description: isArabic 
          ? `تم إرسال ${successCount} بريد إلكتروني لـ ${totalBookingsUpdated} حجز${failCount > 0 ? ` (فشل ${failCount})` : ''}`
          : `Sent ${successCount} email(s) for ${totalBookingsUpdated} booking(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      });

      refetch();
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال التذكيرات' : 'Failed to send reminders',
        variant: 'destructive',
      });
    } finally {
      setSendingReminders(false);
    }
  };


  const statsCards = [
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: stats.totalRevenue,
      suffix: isArabic ? 'ر.س' : 'SAR',
      icon: DollarSign,
      color: 'text-foreground',
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
      <StaffHeader title="Dashboard" titleAr="لوحة التحكم" showNotifications />

      <main className="flex-1 pt-20 pb-4 px-3 sm:px-4 md:px-6">
        <div className="container px-0">
          {/* Quick Actions */}
          <div className="flex justify-end rtl:justify-start gap-2 mb-4">
            <Link to="/scan">
              <Button className="btn-gold gap-2 text-sm">
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline">{isArabic ? 'الماسح' : 'Scanner'}</span>
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 rtl:[direction:rtl]">
            {statsCards.map((stat, index) => (
              <StatsCard key={index} {...stat} loading={statsLoading} />
            ))}
          </div>

          {/* Pending Payments Card with Bulk Reminder */}
          {stats.pendingPaymentsCount > 0 && (
            <Card className="mb-6 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 rtl:flex-row-reverse">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="font-semibold text-foreground">
                      {isArabic ? 'مدفوعات معلقة' : 'Pending Payments'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingPaymentsCount} {isArabic ? 'حجز' : 'booking(s)'} · {stats.pendingPaymentsAmount.toLocaleString()} {isArabic ? 'ر.س' : 'SAR'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    className="border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {isArabic ? 'معاينة' : 'Preview'}
                  </Button>
                  <Button
                    onClick={handleSendAllReminders}
                    disabled={sendingReminders}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 flex-1 sm:flex-none"
                  >
                    {sendingReminders ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isArabic ? 'إرسال تذكيرات للجميع' : 'Send All Reminders'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Tabs Navigation */}
          <Tabs defaultValue="bookings" className="space-y-4" activationMode="manual">
            <TabsList className="glass-card-gold p-1 h-auto flex-wrap rtl:[direction:rtl]">
              <TabsTrigger 
                value="bookings" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <Ticket className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'الحجوزات' : 'Bookings'}
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'التقارير' : 'Reports'}
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'الإعدادات' : 'Settings'}
              </TabsTrigger>
              <TabsTrigger 
                value="groups" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'الشركات' : 'Corporate'}
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'الرسائل' : 'Messages'}
              </TabsTrigger>
              <TabsTrigger 
                value="ayn-support" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse"
              >
                <Headset className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'دعم AYN' : 'AYN Support'}
              </TabsTrigger>
              <TabsTrigger 
                value="refunds" 
                className="gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 md:px-6 py-2 rounded-xl transition-all text-xs md:text-sm rtl:flex-row-reverse relative"
              >
                <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {isArabic ? 'الاسترداد' : 'Refunds'}
                {stats.duplicateBookingsCount > 0 && (
                  <span className="absolute -top-1 -end-1 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {stats.duplicateBookingsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card className="glass-card-gold border-0">
                <CardHeader className="border-b border-border/50 p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base md:text-lg rtl:flex-row-reverse">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-gold flex items-center justify-center">
                        <Ticket className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
                      </div>
                      <span className="text-foreground">
                        {isArabic ? 'إدارة الحجوزات' : 'Booking Management'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetch()}
                      disabled={bookingsLoading}
                      className="gap-2 border-accent/30 hover:bg-accent/10"
                    >
                      <RefreshCw className={cn("h-4 w-4", bookingsLoading && "animate-spin")} />
                      <span className="hidden sm:inline">{isArabic ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-3 sm:p-4 md:p-6 pt-4 sm:pt-6">
                  <BookingFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onReset={handleResetFilters}
                    onExport={handleExport}
                    exporting={exporting}
                  />
                  
                  {/* Status Legend - positioned below filters, aligned to end */}
                  <div className="flex justify-end rtl:justify-start">
                    <StatusLegend />
                  </div>
                  
                  <BookingTable
                    bookings={bookings}
                    loading={bookingsLoading}
                    onViewDetails={handleViewDetails}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onBookingUpdated={handleBookingUpdated}
                    onEditBooking={handleEditBooking}
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
            <TabsContent value="reports">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ReportsPanel />
              </Suspense>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <SettingsPanel />
              </Suspense>
            </TabsContent>

            {/* Group Bookings Tab */}
            <TabsContent value="groups">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <GroupBookingsPanel />
              </Suspense>
            </TabsContent>

            {/* Messages Tab - Contact Forms Only */}
            <TabsContent value="messages">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ContactSubmissionsPanel />
              </Suspense>
            </TabsContent>

            {/* AYN Support Tab */}
            <TabsContent value="ayn-support">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <AYNSupportPanel />
              </Suspense>
            </TabsContent>

            {/* Refunds Tab */}
            <TabsContent value="refunds">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <RefundsPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Powered by AYN Footer */}
      <PoweredByAYN className="border-t border-border" />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        bookings={bookings}
        onClearSelection={() => setSelectedIds([])}
        onBookingUpdated={handleBookingUpdated}
      />

      <BookingDetailsDialog
        booking={selectedBooking}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onBookingUpdated={refetch}
      />

      <EditBookingDialog
        booking={editBooking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onBookingUpdated={handleBookingUpdated}
      />

      <EmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
};

export default AdminPage;
