import { useState, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Eye, Mail, MailCheck, MoreHorizontal, RefreshCw, Ticket, Calendar, Users, CheckCircle, Ban, Bell, Loader2, Pencil, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { resendConfirmationEmail, sendPaymentReminder } from '@/lib/emailService';
import { supabase } from '@/integrations/supabase/client';
import { markBookingAsPaid } from '@/lib/manualPaymentService';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
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
      const result = await markBookingAsPaid(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({
        title: isArabic ? 'تم التحديث' : 'Updated',
        description: isArabic 
          ? 'تم تحديث حالة الدفع وإنشاء التذاكر' 
          : 'Payment marked as paid and tickets generated',
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

  const handleGenerateTickets = async (booking: Booking) => {
    setActionLoadingId(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tickets', {
        body: { bookingId: booking.id }
      });
      if (error) throw error;
      
      // Send confirmation email after tickets generated (force bypasses rate limit for admin)
      await supabase.functions.invoke('send-booking-confirmation', {
        body: { bookingId: booking.id, force: true }
      });
      
      toast({
        title: isArabic ? 'تم إنشاء التذاكر' : 'Tickets Generated',
        description: isArabic 
          ? 'تم إنشاء التذاكر وإرسال البريد الإلكتروني' 
          : 'Tickets created and confirmation email sent',
      });
      onBookingUpdated?.();
    } catch (err) {
      console.error('Generate tickets error:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إنشاء التذاكر' : 'Failed to generate tickets',
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

  const getPaymentBadge = (payment_status: string) => {
    const config: Record<string, { className: string; labelAr: string; labelEn: string }> = {
      completed: { 
        className: 'bg-emerald-500/15 text-emerald-600 border-emerald-400/40 dark:text-emerald-400',
        labelAr: 'مدفوع',
        labelEn: 'Paid'
      },
      pending: { 
        className: 'bg-amber-500/15 text-amber-600 border-amber-400/40 dark:text-amber-400',
        labelAr: 'معلق',
        labelEn: 'Pending'
      },
      failed: { 
        className: 'bg-red-500/15 text-red-600 border-red-400/40 dark:text-red-400',
        labelAr: 'فاشل',
        labelEn: 'Failed'
      },
    };
    
    const { className, labelAr, labelEn } = config[payment_status] || config.pending;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          className, 
          'text-[10px] font-medium px-2 py-0.5 rounded-full'
        )}
      >
        {isArabic ? labelAr : labelEn}
      </Badge>
    );
  };

  const getStatusBadge = (booking: Booking) => {
    const { booking_status, payment_status, qr_codes_generated } = booking;
    
    // PRIORITY: Show warning for paid but missing tickets
    if (payment_status === 'completed' && !qr_codes_generated) {
      return (
        <Badge 
          variant="outline" 
          className={cn(
            'bg-red-500/15 text-red-600 border-red-400/40',
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase',
            'dark:text-red-400',
            isRTL && 'flex-row-reverse'
          )}
        >
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-current/10">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
          <span>{isArabic ? 'تذاكر مفقودة!' : 'Missing Tickets!'}</span>
        </Badge>
      );
    }
    
    const isCancelled = booking_status === 'cancelled';
    const isPending = booking_status === 'pending_payment' || payment_status === 'pending';
    
    const config: Record<string, { className: string; icon: React.ElementType; labelAr: string; labelEn: string }> = {
      confirmed: { 
        className: 'bg-gradient-to-r from-emerald-500/15 to-emerald-400/10 text-emerald-600 border-emerald-400/40 shadow-sm shadow-emerald-500/10 dark:from-emerald-500/25 dark:to-emerald-400/15 dark:text-emerald-400',
        icon: CheckCircle,
        labelAr: 'مؤكد',
        labelEn: 'Confirmed'
      },
      pending: { 
        className: 'bg-gradient-to-r from-amber-500/15 to-amber-400/10 text-amber-600 border-amber-400/40 shadow-sm shadow-amber-500/10 dark:from-amber-500/25 dark:to-amber-400/15 dark:text-amber-400',
        icon: Clock,
        labelAr: 'معلق',
        labelEn: 'Pending'
      },
      cancelled: { 
        className: 'bg-gradient-to-r from-red-500/15 to-red-400/10 text-red-600 border-red-400/40 shadow-sm shadow-red-500/10 dark:from-red-500/25 dark:to-red-400/15 dark:text-red-400',
        icon: XCircle,
        labelAr: 'ملغي',
        labelEn: 'Cancelled'
      },
    };
    
    const effectiveStatus = isCancelled ? 'cancelled' : (isPending ? 'pending' : booking_status);
    const { className, icon: Icon, labelAr, labelEn } = config[effectiveStatus] || config.pending;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          className, 
          'flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase',
          isRTL && 'flex-row-reverse'
        )}
      >
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-current/10">
          <Icon className="h-2.5 w-2.5" />
        </span>
        <span>{isArabic ? labelAr : labelEn}</span>
      </Badge>
    );
  };

  // Get journey stage for tracking where customer is
  const getJourneyStage = (booking: Booking) => {
    const { payment_status, payment_id, qr_codes_generated, booking_status, created_at } = booking;
    
    if (booking_status === 'cancelled') {
      return { label: isArabic ? 'ملغي' : 'Cancelled', icon: XCircle, color: 'text-red-500' };
    }
    
    if (payment_status === 'completed') {
      if (qr_codes_generated) {
        return { label: isArabic ? 'مكتمل' : 'Complete', icon: CheckCircle, color: 'text-emerald-500' };
      }
      return { label: isArabic ? 'مدفوع - بدون تذاكر' : 'Paid - No Tickets', icon: AlertTriangle, color: 'text-red-500' };
    }
    
    if (payment_status === 'failed') {
      return { label: isArabic ? 'فشل الدفع' : 'Payment Failed', icon: XCircle, color: 'text-red-500' };
    }
    
    // Check if booking is recent (within 10 minutes) - might still be completing payment
    const createdTime = created_at ? new Date(created_at).getTime() : 0;
    const isRecent = Date.now() - createdTime < 10 * 60 * 1000; // 10 minutes
    
    if (payment_id) {
      // Has payment_id - customer started payment process
      if (isRecent) {
        return { label: isArabic ? 'جاري الدفع' : 'In Progress', icon: Clock, color: 'text-amber-500' };
      }
      return { label: isArabic ? 'دفع معلق' : 'Payment Started', icon: Clock, color: 'text-amber-500' };
    }
    
    // No payment_id - customer never tried to pay
    if (isRecent) {
      return { label: isArabic ? 'جديد' : 'New', icon: Clock, color: 'text-blue-500' };
    }
    return { label: isArabic ? 'نموذج فقط' : 'Form Only', icon: Clock, color: 'text-muted-foreground' };
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PP', { locale: isArabic ? ar : enUS });
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    // Format: "Jan 9, 8:00 AM"
    return format(date, 'MMM d, h:mm a', { locale: isArabic ? ar : enUS });
  };

  // Mobile Card Component
  const MobileBookingCard = ({ booking }: { booking: Booking }) => {
    const isCancelled = booking.booking_status === 'cancelled';
    return (
    <div className={cn(
      'glass-card rounded-xl border p-4 space-y-3 transition-all',
      isCancelled 
        ? 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20' 
        : 'border-accent/20'
    )}>
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
        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          {getPaymentBadge(booking.payment_status)}
          {getStatusBadge(booking)}
        </div>
      </div>

      {/* Customer Info */}
      <div className="text-start">
        <p className="font-medium text-foreground">{booking.customer_name}</p>
        <p className="text-sm text-muted-foreground truncate">{booking.customer_email}</p>
      </div>

      {/* Date, Purchased, Tickets */}
      <div className="flex flex-wrap gap-3 text-sm rtl:[direction:rtl]">
        <div className="flex items-center gap-1.5 text-muted-foreground rtl:flex-row-reverse">
          <Calendar className="h-4 w-4 text-accent" />
          <span>{formatDate(booking.visit_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground rtl:flex-row-reverse">
          <Clock className="h-4 w-4 text-accent" />
          <span>{formatDateTime(booking.created_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground rtl:flex-row-reverse">
          <Users className="h-4 w-4 text-accent" />
          <span>{booking.adult_count + booking.child_count + (booking.senior_count || 0)} {isArabic ? 'تذاكر' : 'tickets'}</span>
        </div>
      </div>

      {/* Amount + Email/Reminder Status + Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-accent/10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent">
            {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
          </span>
          {booking.confirmation_email_sent ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center" title={isArabic ? 'تم إرسال التأكيد' : 'Confirmation sent'}>
              <MailCheck className="h-3 w-3 text-emerald-600" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          {booking.reminder_email_sent && (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center" title={isArabic ? 'تم إرسال التذكير' : 'Reminder sent'}>
              <Bell className="h-3 w-3 text-amber-600" />
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
              {booking.payment_status === 'completed' && !booking.qr_codes_generated && (
                <DropdownMenuItem 
                  onClick={() => handleGenerateTickets(booking)}
                  className="cursor-pointer text-amber-600 hover:bg-amber-500/10"
                >
                  <Ticket className="h-4 w-4 me-2" />
                  {isArabic ? 'إنشاء التذاكر' : 'Generate Tickets'}
                </DropdownMenuItem>
              )}
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
  };

  const renderRow = (booking: Booking) => (
    <>
      {onSelectionChange && (
        <TableCell className="w-10 p-2">
          <Checkbox
            checked={selectedIds.includes(booking.id)}
            onCheckedChange={() => handleSelectOne(booking.id)}
            className="border-accent/50"
          />
        </TableCell>
      )}
      <TableCell className="w-[9%] font-mono text-xs font-semibold text-accent text-start truncate p-2">
        {booking.booking_reference}
      </TableCell>
      <TableCell className="w-[14%] text-start p-2">
        <div className="truncate">
          <p className="font-medium text-foreground truncate text-sm">{booking.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{booking.customer_email}</p>
        </div>
      </TableCell>
      <TableCell className="w-[8%] text-foreground text-start text-sm p-2 truncate">{formatDate(booking.visit_date)}</TableCell>
      <TableCell className="w-[10%] text-foreground text-start text-sm p-2">{formatDateTime(booking.created_at)}</TableCell>
      <TableCell className="w-[4%] text-center p-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 text-accent font-semibold text-sm">
          {booking.adult_count + booking.child_count + (booking.senior_count || 0)}
        </span>
      </TableCell>
      <TableCell className="w-[7%] font-semibold text-accent text-start text-sm p-2">
        {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
      </TableCell>
      <TableCell className="w-[6%] p-2">{getPaymentBadge(booking.payment_status)}</TableCell>
      <TableCell className="w-[9%] p-2">{getStatusBadge(booking)}</TableCell>
      <TableCell className="w-[8%] p-2">
        {(() => {
          const stage = getJourneyStage(booking);
          const Icon = stage.icon;
          return (
            <div className={cn("flex items-center gap-1.5", stage.color, isRTL && 'flex-row-reverse')}>
              <Icon className="h-4 w-4" />
              <span className="text-xs">{stage.label}</span>
            </div>
          );
        })()}
      </TableCell>
      <TableCell className="w-10 p-2 text-center">
        {booking.confirmation_email_sent ? (
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="w-10 p-2 text-center">
        {booking.reminder_email_sent ? (
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto" title={isArabic ? 'تم إرسال التذكير' : 'Reminder Sent'}>
            <Bell className="h-3.5 w-3.5 text-amber-600" />
          </div>
        ) : booking.payment_status === 'pending' ? (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mx-auto" title={isArabic ? 'لم يتم إرسال تذكير' : 'No reminder sent'}>
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ) : null}
      </TableCell>
      <TableCell className="w-12 p-0 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 mx-auto hover:bg-accent/10">
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
            {booking.payment_status === 'completed' && !booking.qr_codes_generated && (
              <DropdownMenuItem 
                onClick={() => handleGenerateTickets(booking)}
                className="cursor-pointer text-amber-600 hover:bg-amber-500/10"
              >
                <Ticket className="h-4 w-4 me-2" />
                {isArabic ? 'إنشاء التذاكر' : 'Generate Tickets'}
              </DropdownMenuItem>
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
          <div className="overflow-x-auto glass-card rounded-xl border border-accent/20">
            <Table dir={isRTL ? 'rtl' : 'ltr'} className="table-fixed w-full min-w-[900px]">
              <TableHeader>
                <TableRow className="border-b border-accent/20 hover:bg-transparent">
                  {onSelectionChange && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === bookings.length && bookings.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-accent/50"
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[9%] text-accent font-semibold text-start">{isArabic ? 'رقم الحجز' : 'Ref'}</TableHead>
                  <TableHead className="w-[14%] text-accent font-semibold text-start">{isArabic ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead className="w-[8%] text-accent font-semibold text-start">{isArabic ? 'الزيارة' : 'Visit'}</TableHead>
                  <TableHead className="w-[10%] text-accent font-semibold text-start">{isArabic ? 'وقت الشراء' : 'Purchased'}</TableHead>
                  <TableHead className="w-[4%] text-accent font-semibold text-center">{isArabic ? 'عدد' : '#'}</TableHead>
                  <TableHead className="w-[7%] text-accent font-semibold text-start">{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead className="w-[6%] text-accent font-semibold">{isArabic ? 'الدفع' : 'Payment'}</TableHead>
                  <TableHead className="w-[9%] text-accent font-semibold">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="w-[8%] text-accent font-semibold">{isArabic ? 'المرحلة' : 'Stage'}</TableHead>
                  <TableHead className="w-10 text-accent font-semibold text-center" title={isArabic ? 'البريد' : 'Email'}><Mail className="h-4 w-4 mx-auto" /></TableHead>
                  <TableHead className="w-10 text-accent font-semibold text-center" title={isArabic ? 'التذكير' : 'Reminder'}><Bell className="h-4 w-4 mx-auto" /></TableHead>
                  <TableHead className="w-12 text-center text-accent font-semibold p-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const isCancelled = booking.booking_status === 'cancelled';
                  return (
                    <TableRow 
                      key={booking.id} 
                      className={cn(
                        'border-b border-accent/10 hover:bg-accent/5 transition-colors',
                        isCancelled && 'bg-red-50/50 dark:bg-red-950/20'
                      )}
                    >
                      {renderRow(booking)}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          // Virtual scrolling table for large datasets
          <div className="glass-card rounded-xl border border-accent/20 overflow-x-auto">
            <div className="overflow-hidden">
              <Table dir={isRTL ? 'rtl' : 'ltr'} className="table-fixed w-full min-w-[900px]">
                <TableHeader>
                  <TableRow className="border-b border-accent/20 hover:bg-transparent">
                    {onSelectionChange && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.length === bookings.length && bookings.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-accent/50"
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[9%] text-accent font-semibold text-start">{isArabic ? 'رقم الحجز' : 'Ref'}</TableHead>
                    <TableHead className="w-[14%] text-accent font-semibold text-start">{isArabic ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead className="w-[8%] text-accent font-semibold text-start">{isArabic ? 'الزيارة' : 'Visit'}</TableHead>
                    <TableHead className="w-[10%] text-accent font-semibold text-start">{isArabic ? 'وقت الشراء' : 'Purchased'}</TableHead>
                    <TableHead className="w-[4%] text-accent font-semibold text-center">{isArabic ? 'عدد' : '#'}</TableHead>
                    <TableHead className="w-[7%] text-accent font-semibold text-start">{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead className="w-[6%] text-accent font-semibold">{isArabic ? 'الدفع' : 'Payment'}</TableHead>
                    <TableHead className="w-[9%] text-accent font-semibold">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="w-[8%] text-accent font-semibold">{isArabic ? 'المرحلة' : 'Stage'}</TableHead>
                    <TableHead className="w-10 text-accent font-semibold text-center" title={isArabic ? 'البريد' : 'Email'}><Mail className="h-4 w-4 mx-auto" /></TableHead>
                    <TableHead className="w-10 text-accent font-semibold text-center" title={isArabic ? 'التذكير' : 'Reminder'}><Bell className="h-4 w-4 mx-auto" /></TableHead>
                    <TableHead className="w-12 text-center text-accent font-semibold p-0"></TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            <div 
              ref={parentRef}
              className="overflow-auto max-h-[600px]"
            >
              <Table dir={isRTL ? 'rtl' : 'ltr'} className="table-fixed w-full min-w-[900px]">
                <TableBody>
                  {/* Top spacer row */}
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} />
                  )}
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const booking = bookings[virtualRow.index];
                    const isCancelled = booking.booking_status === 'cancelled';
                    return (
                      <TableRow
                        key={booking.id}
                        data-index={virtualRow.index}
                        className={cn(
                          'border-b border-accent/10 hover:bg-accent/5 transition-colors',
                          isCancelled && 'bg-red-50/50 dark:bg-red-950/20'
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {renderRow(booking)}
                      </TableRow>
                    );
                  })}
                  {/* Bottom spacer row */}
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ 
                      height: virtualizer.getTotalSize() - 
                        (virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1]?.start ?? 0) - 
                        ROW_HEIGHT 
                    }} />
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

BookingTable.displayName = 'BookingTable';

export default BookingTable;