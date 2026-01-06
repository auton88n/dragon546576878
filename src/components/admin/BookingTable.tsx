import { useState, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Eye, Mail, MailCheck, MoreHorizontal, RefreshCw, Ticket, Calendar, Users, CheckCircle, Ban, Bell, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { resendConfirmationEmail, sendPaymentReminder } from '@/lib/emailService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

type Booking = Tables<'bookings'>;

interface BookingTableProps {
  bookings: Booking[];
  loading: boolean;
  onViewDetails: (booking: Booking) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBookingUpdated?: () => void;
  onEditBooking?: (booking: Booking) => void;
}

const ROW_HEIGHT = 72;
const VIRTUAL_THRESHOLD = 50;

const BookingTable = memo(({ bookings, loading, onViewDetails, selectedIds = [], onSelectionChange, onBookingUpdated, onEditBooking }: BookingTableProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirtual = bookings.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: bookings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    enabled: useVirtual,
  });

  const handleResendEmail = async (booking: Booking) => {
    setResendingId(booking.id);
    try {
      const success = await resendConfirmationEmail(booking.id);
      if (success) {
        toast({
          title: isArabic ? 'تم الإرسال' : 'Email Sent',
          description: isArabic 
            ? 'تم إعادة إرسال البريد الإلكتروني بنجاح'
            : 'Confirmation email resent successfully',
        });
      } else {
        throw new Error('Failed to send');
      }
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic 
          ? 'فشل في إعادة إرسال البريد الإلكتروني'
          : 'Failed to resend confirmation email',
        variant: 'destructive',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleMarkAsPaid = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'completed', 
          paid_at: new Date().toISOString(),
          booking_status: 'confirmed'
        })
        .eq('id', booking.id);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم التحديث' : 'Updated',
        description: isArabic ? 'تم تحديث حالة الدفع' : 'Payment marked as paid',
      });
      onBookingUpdated?.();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل التحديث' : 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'cancelled', 
          cancelled_at: new Date().toISOString() 
        })
        .eq('id', booking.id);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم الإلغاء' : 'Cancelled',
        description: isArabic ? 'تم إلغاء الحجز' : 'Booking cancelled',
      });
      onBookingUpdated?.();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل الإلغاء' : 'Failed to cancel',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم الحذف' : 'Deleted',
        description: isArabic ? 'تم حذف الحجز بنجاح' : 'Booking deleted successfully',
      });
      setDeleteConfirmId(null);
      onBookingUpdated?.();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل حذف الحجز' : 'Failed to delete booking',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReminder = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    try {
      const success = await sendPaymentReminder(booking.id);
      if (success) {
        toast({
          title: isArabic ? 'تم الإرسال' : 'Reminder Sent',
          description: isArabic 
            ? 'تم إرسال تذكير الدفع'
            : 'Payment reminder sent successfully',
        });
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال التذكير' : 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === bookings.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(bookings.map(b => b.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    // Handle pending_payment status
    if (status === 'pending_payment' || paymentStatus === 'pending') {
      return (
        <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400">
          {isArabic ? 'في انتظار الدفع' : 'Awaiting Payment'}
        </Badge>
      );
    }
    
    const config: Record<string, { className: string; labelAr: string; labelEn: string }> = {
      confirmed: { 
        className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
        labelAr: 'مؤكد',
        labelEn: 'Confirmed'
      },
      pending: { 
        className: 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
        labelAr: 'معلق',
        labelEn: 'Pending'
      },
      cancelled: { 
        className: 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400',
        labelAr: 'ملغي',
        labelEn: 'Cancelled'
      },
    };
    const { className, labelAr, labelEn } = config[status] || { className: '', labelAr: status, labelEn: status };
    return (
      <Badge variant="outline" className={className}>
        {isArabic ? labelAr : labelEn}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PP', { locale: isArabic ? ar : enUS });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Mobile Card Component
  const MobileBookingCard = ({ booking }: { booking: Booking }) => (
    <div className="glass-card rounded-xl border border-accent/20 p-4 space-y-3">
      {/* Selection + Header */}
      <div className="flex items-center justify-between rtl:flex-row-reverse">
        <div className="flex items-center gap-3 rtl:flex-row-reverse">
          {onSelectionChange && (
            <Checkbox
              checked={selectedIds.includes(booking.id)}
              onCheckedChange={() => handleSelectOne(booking.id)}
              className="border-accent/50"
            />
          )}
          <span className="font-mono font-semibold text-accent text-sm">
            {booking.booking_reference}
          </span>
        </div>
        {getStatusBadge(booking.booking_status, booking.payment_status)}
      </div>

      {/* Customer Info */}
      <div className="text-start">
        <p className="font-medium text-foreground">{booking.customer_name}</p>
        <p className="text-sm text-muted-foreground truncate">{booking.customer_email}</p>
      </div>

      {/* Date, Time, Tickets */}
      <div className="flex flex-wrap gap-3 text-sm rtl:[direction:rtl]">
        <div className="flex items-center gap-1.5 text-muted-foreground rtl:flex-row-reverse">
          <Calendar className="h-4 w-4 text-accent" />
          <span>{formatDate(booking.visit_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground rtl:flex-row-reverse">
          <Users className="h-4 w-4 text-accent" />
          <span>{booking.adult_count + booking.child_count + (booking.senior_count || 0)} {isArabic ? 'تذاكر' : 'tickets'}</span>
        </div>
      </div>

      {/* Amount + Email Status + Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-accent/10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-accent">
            {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
          </span>
          {booking.confirmation_email_sent ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MailCheck className="h-3 w-3 text-emerald-600" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(booking)}
            className="h-8 text-xs border-accent/30 hover:bg-accent/10"
          >
            <Eye className="h-3 w-3 me-1" />
            {isArabic ? 'عرض' : 'View'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-accent/30 hover:bg-accent/10">
                {actionLoadingId === booking.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-3 w-3" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="bg-card border-border">
              {booking.payment_status === 'pending' && booking.booking_status !== 'cancelled' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleMarkAsPaid(booking)}
                    className="cursor-pointer text-emerald-600 hover:bg-emerald-500/10"
                  >
                    <CheckCircle className="h-4 w-4 me-2" />
                    {isArabic ? 'تأكيد الدفع' : 'Mark as Paid'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleSendReminder(booking)}
                    className="cursor-pointer text-amber-600 hover:bg-amber-500/10"
                  >
                    <Bell className="h-4 w-4 me-2" />
                    {isArabic ? 'إرسال تذكير' : 'Send Reminder'}
                  </DropdownMenuItem>
                </>
              )}
              {booking.booking_status !== 'cancelled' && (
                <DropdownMenuItem 
                  onClick={() => handleCancelBooking(booking)}
                  className="cursor-pointer text-red-600 hover:bg-red-500/10"
                >
                  <Ban className="h-4 w-4 me-2" />
                  {isArabic ? 'إلغاء الحجز' : 'Cancel Booking'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => setDeleteConfirmId(booking.id)}
                className="cursor-pointer text-red-700 hover:bg-red-600/10"
              >
                <Trash2 className="h-4 w-4 me-2" />
                {isArabic ? 'حذف الحجز' : 'Delete Booking'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleResendEmail(booking)}
                disabled={resendingId === booking.id}
                className="cursor-pointer hover:bg-accent/10"
              >
                {resendingId === booking.id ? (
                  <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 me-2 text-accent" />
                )}
                {isArabic ? 'إعادة إرسال البريد' : 'Resend Email'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  const renderRow = (booking: Booking) => (
    <>
      {onSelectionChange && (
        <TableCell className="w-12">
          <Checkbox
            checked={selectedIds.includes(booking.id)}
            onCheckedChange={() => handleSelectOne(booking.id)}
            className="border-accent/50"
          />
        </TableCell>
      )}
      <TableCell className="font-mono font-semibold text-accent text-start">
        {booking.booking_reference}
      </TableCell>
      <TableCell className="text-start">
        <div>
          <p className="font-medium text-foreground">{booking.customer_name}</p>
          <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
        </div>
      </TableCell>
      <TableCell className="text-foreground text-start">{formatDate(booking.visit_date)}</TableCell>
      <TableCell className="text-foreground text-start">{formatTime(booking.visit_time)}</TableCell>
      <TableCell>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-semibold">
          {booking.adult_count + booking.child_count + (booking.senior_count || 0)}
        </span>
      </TableCell>
      <TableCell className="font-semibold text-accent text-start">
        {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
      </TableCell>
      <TableCell>{getStatusBadge(booking.booking_status, booking.payment_status)}</TableCell>
      <TableCell>
        {booking.confirmation_email_sent ? (
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <MailCheck className="h-4 w-4 text-emerald-600" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent/10">
              {actionLoadingId === booking.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="bg-card border-border">
            <DropdownMenuItem 
              onClick={() => onViewDetails(booking)}
              className="cursor-pointer hover:bg-accent/10"
            >
              <Eye className="h-4 w-4 me-2 text-accent" />
              {isArabic ? 'عرض التفاصيل' : 'View Details'}
            </DropdownMenuItem>
            {onEditBooking && booking.booking_status !== 'cancelled' && (
              <DropdownMenuItem 
                onClick={() => onEditBooking(booking)}
                className="cursor-pointer hover:bg-accent/10"
              >
                <Pencil className="h-4 w-4 me-2 text-blue-500" />
                {isArabic ? 'تعديل الحجز' : 'Edit Booking'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {booking.payment_status === 'pending' && booking.booking_status !== 'cancelled' && (
              <>
                <DropdownMenuItem 
                  onClick={() => handleMarkAsPaid(booking)}
                  className="cursor-pointer text-emerald-600 hover:bg-emerald-500/10"
                >
                  <CheckCircle className="h-4 w-4 me-2" />
                  {isArabic ? 'تأكيد الدفع' : 'Mark as Paid'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSendReminder(booking)}
                  className="cursor-pointer text-amber-600 hover:bg-amber-500/10"
                >
                  <Bell className="h-4 w-4 me-2" />
                  {isArabic ? 'إرسال تذكير' : 'Send Reminder'}
                </DropdownMenuItem>
              </>
            )}
            {booking.booking_status !== 'cancelled' && (
              <DropdownMenuItem 
                onClick={() => handleCancelBooking(booking)}
                className="cursor-pointer text-red-600 hover:bg-red-500/10"
              >
                <Ban className="h-4 w-4 me-2" />
                {isArabic ? 'إلغاء الحجز' : 'Cancel Booking'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => setDeleteConfirmId(booking.id)}
              className="cursor-pointer text-red-700 hover:bg-red-600/10"
            >
              <Trash2 className="h-4 w-4 me-2" />
              {isArabic ? 'حذف الحجز' : 'Delete Booking'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleResendEmail(booking)}
              disabled={resendingId === booking.id}
              className="cursor-pointer hover:bg-accent/10"
            >
              {resendingId === booking.id ? (
                <RefreshCw className="h-4 w-4 me-2 animate-spin text-accent" />
              ) : (
                <Mail className="h-4 w-4 me-2 text-accent" />
              )}
              {isArabic ? 'إعادة إرسال البريد' : 'Resend Email'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </>
  );

  // Add delete confirmation dialog before the loading check
  const deleteDialog = (
    <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isArabic 
              ? 'هل أنت متأكد من حذف هذا الحجز؟ سيتم حذف جميع التذاكر المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.'
              : 'Are you sure you want to delete this booking? All associated tickets will also be deleted. This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteConfirmId && handleDeleteBooking(deleteConfirmId)}
            className="bg-red-600 hover:bg-red-700"
          >
            {isArabic ? 'حذف' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-accent/10" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
          <Ticket className="h-10 w-10 text-accent/50" />
        </div>
        <p className="text-muted-foreground text-lg">{isArabic ? 'لا توجد حجوزات' : 'No bookings found'}</p>
      </div>
    );
  }

  // Mobile view - card layout
  return (
    <>
      {/* Mobile Cards - visible on small screens */}
      <div className="md:hidden space-y-3">
        {bookings.map((booking) => (
          <MobileBookingCard key={booking.id} booking={booking} />
        ))}
      </div>

      {/* Desktop Table - hidden on small screens */}
      <div className="hidden md:block">
        {!useVirtual ? (
          <div className="overflow-x-auto scrollbar-hide glass-card rounded-xl border border-accent/20">
            <Table dir={isRTL ? 'rtl' : 'ltr'}>
              <TableHeader>
                <TableRow className="border-b border-accent/20 hover:bg-transparent">
                  {onSelectionChange && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === bookings.length && bookings.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-accent/50"
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-accent font-semibold text-start">{isArabic ? 'رقم الحجز' : 'Reference'}</TableHead>
                  <TableHead className="text-accent font-semibold text-start">{isArabic ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead className="text-accent font-semibold text-start">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</TableHead>
                  <TableHead className="text-accent font-semibold text-start">{isArabic ? 'الوقت' : 'Time'}</TableHead>
                  <TableHead className="text-accent font-semibold">{isArabic ? 'التذاكر' : 'Tickets'}</TableHead>
                  <TableHead className="text-accent font-semibold text-start">{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead className="text-accent font-semibold">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-accent font-semibold">{isArabic ? 'البريد' : 'Email'}</TableHead>
                  <TableHead className="text-end text-accent font-semibold">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow 
                    key={booking.id} 
                    className="border-b border-accent/10 hover:bg-accent/5 transition-colors"
                  >
                    {renderRow(booking)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          // Virtual scrolling table for large datasets
          <div className="glass-card rounded-xl border border-accent/20 overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <Table dir={isRTL ? 'rtl' : 'ltr'}>
                <TableHeader>
                  <TableRow className="border-b border-accent/20 hover:bg-transparent">
                    {onSelectionChange && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === bookings.length && bookings.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-accent/50"
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-accent font-semibold min-w-[120px] text-start">{isArabic ? 'رقم الحجز' : 'Reference'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[180px] text-start">{isArabic ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[130px] text-start">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[80px] text-start">{isArabic ? 'الوقت' : 'Time'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[80px]">{isArabic ? 'التذاكر' : 'Tickets'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[100px] text-start">{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[100px]">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-accent font-semibold min-w-[60px]">{isArabic ? 'البريد' : 'Email'}</TableHead>
                    <TableHead className="text-end text-accent font-semibold min-w-[80px]">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            <div 
              ref={parentRef}
              className="overflow-auto max-h-[500px] scrollbar-hide"
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                <Table dir={isRTL ? 'rtl' : 'ltr'}>
                  <TableBody>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const booking = bookings[virtualRow.index];
                      return (
                        <TableRow
                          key={booking.id}
                          data-index={virtualRow.index}
                          ref={virtualizer.measureElement}
                          className="border-b border-accent/10 hover:bg-accent/5 transition-colors"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {renderRow(booking)}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

BookingTable.displayName = 'BookingTable';

export default BookingTable;