import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Mail, Phone, Calendar, Clock, Ticket, CreditCard, RefreshCw, MailCheck, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { resendConfirmationEmail } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type Booking = Tables<'bookings'>;
type TicketType = Tables<'tickets'>;

interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookingDetailsDialog = ({ booking, open, onOpenChange }: BookingDetailsDialogProps) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (booking && open) {
      fetchTickets();
    }
  }, [booking, open]);

  const fetchTickets = async () => {
    if (!booking) return;
    setLoadingTickets(true);
    try {
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('booking_id', booking.id);
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleResendEmail = async () => {
    if (!booking) return;
    setResending(true);
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
        throw new Error('Failed');
      }
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic 
          ? 'فشل في إعادة إرسال البريد الإلكتروني'
          : 'Failed to resend email',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  if (!booking) return null;

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isArabic ? ar : enUS });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTicketTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      adult: { ar: 'بالغ', en: 'Adult' },
      child: { ar: 'طفل', en: 'Child' },
      senior: { ar: 'كبير السن', en: 'Senior' },
    };
    return isArabic ? labels[type]?.ar : labels[type]?.en || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isArabic ? 'تفاصيل الحجز' : 'Booking Details'}</span>
            <Badge variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'}>
              {booking.booking_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Reference */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {isArabic ? 'رقم الحجز' : 'Booking Reference'}
            </p>
            <p className="text-2xl font-bold font-mono tracking-wider">
              {booking.booking_reference}
            </p>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {isArabic ? 'معلومات العميل' : 'Customer Information'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الاسم' : 'Name'}</p>
                <p className="font-medium">{booking.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'البريد الإلكتروني' : 'Email'}</p>
                <p className="font-medium">{booking.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الهاتف' : 'Phone'}</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {booking.customer_phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'اللغة' : 'Language'}</p>
                <p className="font-medium">{booking.language === 'ar' ? 'العربية' : 'English'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visit Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isArabic ? 'تفاصيل الزيارة' : 'Visit Details'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium">{formatDate(booking.visit_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الوقت' : 'Time'}</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(booking.visit_time)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tickets */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              {isArabic ? 'التذاكر' : 'Tickets'}
            </h3>
            <div className="space-y-2">
              {booking.adult_count > 0 && (
                <div className="flex justify-between">
                  <span>{isArabic ? 'بالغ' : 'Adult'} × {booking.adult_count}</span>
                  <span>{booking.adult_count * Number(booking.adult_price)} SAR</span>
                </div>
              )}
              {booking.child_count > 0 && (
                <div className="flex justify-between">
                  <span>{isArabic ? 'طفل' : 'Child'} × {booking.child_count}</span>
                  <span>{booking.child_count * Number(booking.child_price)} SAR</span>
                </div>
              )}
              {(booking.senior_count || 0) > 0 && (
                <div className="flex justify-between">
                  <span>{isArabic ? 'كبير السن' : 'Senior'} × {booking.senior_count}</span>
                  <span>{(booking.senior_count || 0) * Number(booking.senior_price || 0)} SAR</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{isArabic ? 'المجموع' : 'Total'}</span>
                <span>{booking.total_amount} SAR</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Generated Tickets */}
          <div>
            <h3 className="font-semibold mb-3">
              {isArabic ? 'رموز QR' : 'QR Codes'} ({tickets.length})
            </h3>
            {loadingTickets ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`border rounded-lg p-3 text-center ${
                      ticket.is_used ? 'bg-muted/50 opacity-60' : ''
                    }`}
                  >
                    {ticket.qr_code_url && (
                      <img
                        src={ticket.qr_code_url}
                        alt="QR Code"
                        className="w-20 h-20 mx-auto mb-2"
                      />
                    )}
                    <p className="text-xs font-mono">{ticket.ticket_code}</p>
                    <Badge variant={ticket.is_used ? 'secondary' : 'outline'} className="mt-1">
                      {ticket.is_used 
                        ? (isArabic ? 'مستخدم' : 'Used') 
                        : getTicketTypeLabel(ticket.ticket_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Info */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {isArabic ? 'معلومات الدفع' : 'Payment Information'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الحالة' : 'Status'}</p>
                <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                  {booking.payment_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'معرف الدفع' : 'Payment ID'}</p>
                <p className="font-mono text-sm">{booking.payment_id || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Status & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {booking.confirmation_email_sent ? (
                <>
                  <MailCheck className="h-5 w-5 text-success" />
                  <span className="text-success">
                    {isArabic ? 'تم إرسال البريد الإلكتروني' : 'Email Sent'}
                  </span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isArabic ? 'لم يتم إرسال البريد' : 'Email Not Sent'}
                  </span>
                </>
              )}
            </div>
            <Button 
              onClick={handleResendEmail} 
              disabled={resending}
              variant="outline"
            >
              {resending ? (
                <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              )}
              {isArabic ? 'إعادة إرسال البريد' : 'Resend Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsDialog;
