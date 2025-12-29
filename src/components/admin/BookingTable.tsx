import { useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Eye, Mail, MailCheck, MoreHorizontal, RefreshCw } from 'lucide-react';
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

const BookingTable = ({ bookings, loading, onViewDetails }: BookingTableProps) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [resendingId, setResendingId] = useState<string | null>(null);

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
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
    };
    const labels: Record<string, { ar: string; en: string }> = {
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      pending: { ar: 'معلق', en: 'Pending' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {isArabic ? labels[status]?.ar : labels[status]?.en || status}
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>{isArabic ? 'لا توجد حجوزات' : 'No bookings found'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isArabic ? 'رقم الحجز' : 'Reference'}</TableHead>
            <TableHead>{isArabic ? 'العميل' : 'Customer'}</TableHead>
            <TableHead>{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</TableHead>
            <TableHead>{isArabic ? 'الوقت' : 'Time'}</TableHead>
            <TableHead>{isArabic ? 'التذاكر' : 'Tickets'}</TableHead>
            <TableHead>{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
            <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
            <TableHead>{isArabic ? 'البريد' : 'Email'}</TableHead>
            <TableHead className="text-right rtl:text-left">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-mono font-medium">
                {booking.booking_reference}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{booking.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                </div>
              </TableCell>
              <TableCell>{formatDate(booking.visit_date)}</TableCell>
              <TableCell>{formatTime(booking.visit_time)}</TableCell>
              <TableCell>
                <span className="text-sm">
                  {booking.adult_count + booking.child_count + (booking.senior_count || 0)}
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
              </TableCell>
              <TableCell>{getStatusBadge(booking.booking_status)}</TableCell>
              <TableCell>
                {booking.confirmation_email_sent ? (
                  <MailCheck className="h-4 w-4 text-success" />
                ) : (
                  <Mail className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell className="text-right rtl:text-left">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(booking)}>
                      <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      {isArabic ? 'عرض التفاصيل' : 'View Details'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleResendEmail(booking)}
                      disabled={resendingId === booking.id}
                    >
                      {resendingId === booking.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      )}
                      {isArabic ? 'إعادة إرسال البريد' : 'Resend Email'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BookingTable;
