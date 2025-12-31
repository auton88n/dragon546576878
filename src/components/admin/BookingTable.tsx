import { useState, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Eye, Mail, MailCheck, MoreHorizontal, RefreshCw, Ticket, Calendar, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { resendConfirmationEmail } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

type Booking = Tables<'bookings'>;

interface BookingTableProps {
  bookings: Booking[];
  loading: boolean;
  onViewDetails: (booking: Booking) => void;
}

const ROW_HEIGHT = 72;
const VIRTUAL_THRESHOLD = 50;

const BookingTable = memo(({ bookings, loading, onViewDetails }: BookingTableProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [resendingId, setResendingId] = useState<string | null>(null);
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

  const getStatusBadge = (status: string) => {
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
      {/* Header: Reference + Status */}
      <div className="flex items-center justify-between rtl:flex-row-reverse">
        <span className="font-mono font-semibold text-accent text-sm">
          {booking.booking_reference}
        </span>
        {getStatusBadge(booking.booking_status)}
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleResendEmail(booking)}
            disabled={resendingId === booking.id}
            className="h-8 text-xs border-accent/30 hover:bg-accent/10"
          >
            {resendingId === booking.id ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderRow = (booking: Booking) => (
    <>
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
      <TableCell>{getStatusBadge(booking.booking_status)}</TableCell>
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
              <MoreHorizontal className="h-4 w-4" />
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
          <div className="overflow-x-auto scrollbar-hide glass-card rounded-xl border border-accent/20">
            <Table dir={isRTL ? 'rtl' : 'ltr'}>
              <TableHeader>
                <TableRow className="border-b border-accent/20 hover:bg-transparent">
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