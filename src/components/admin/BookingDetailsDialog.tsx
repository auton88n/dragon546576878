import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Mail, Phone, Calendar, Clock, Ticket, CreditCard, RefreshCw, MailCheck, X, User, Globe } from 'lucide-react';
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

  const getStatusConfig = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      confirmed: { 
        className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
        label: isArabic ? 'مؤكد' : 'Confirmed'
      },
      pending: { 
        className: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
        label: isArabic ? 'معلق' : 'Pending'
      },
      cancelled: { 
        className: 'bg-red-500/20 text-red-700 border-red-500/30',
        label: isArabic ? 'ملغي' : 'Cancelled'
      },
    };
    return config[status] || { className: '', label: status };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-accent/20">
        <DialogHeader className="pb-4 border-b border-accent/10">
          <DialogTitle className="flex items-center justify-between rtl:flex-row-reverse">
            <span className="text-xl font-bold text-foreground">{isArabic ? 'تفاصيل الحجز' : 'Booking Details'}</span>
            <Badge variant="outline" className={getStatusConfig(booking.booking_status).className}>
              {getStatusConfig(booking.booking_status).label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Booking Reference */}
          <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl p-6 text-center border border-accent/20">
            <p className="text-sm text-muted-foreground mb-2">
              {isArabic ? 'رقم الحجز' : 'Booking Reference'}
            </p>
            <p className="text-3xl font-bold font-mono tracking-wider text-accent">
              {booking.booking_reference}
            </p>
          </div>

          {/* Customer Info */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              {isArabic ? 'معلومات العميل' : 'Customer Information'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'الاسم' : 'Name'}</p>
                <p className="font-medium text-foreground">{booking.customer_name}</p>
              </div>
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'البريد الإلكتروني' : 'Email'}</p>
                <p className="font-medium text-foreground flex items-center gap-2 rtl:flex-row-reverse rtl:justify-end">
                  <Mail className="h-4 w-4 text-accent" />
                  {booking.customer_email}
                </p>
              </div>
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'الهاتف' : 'Phone'}</p>
                <p className="font-medium text-foreground flex items-center gap-2 rtl:flex-row-reverse rtl:justify-end">
                  <Phone className="h-4 w-4 text-accent" />
                  {booking.customer_phone}
                </p>
              </div>
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'اللغة' : 'Language'}</p>
                <p className="font-medium text-foreground flex items-center gap-2 rtl:flex-row-reverse rtl:justify-end">
                  <Globe className="h-4 w-4 text-accent" />
                  {booking.language === 'ar' ? 'العربية' : 'English'}
                </p>
              </div>
            </div>
          </div>

          {/* Visit Details */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              {isArabic ? 'تفاصيل الزيارة' : 'Visit Details'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-foreground">{formatDate(booking.visit_date)}</p>
              </div>
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'الوقت' : 'Time'}</p>
                <p className="font-medium text-foreground flex items-center gap-2 rtl:flex-row-reverse rtl:justify-end">
                  <Clock className="h-4 w-4 text-accent" />
                  {formatTime(booking.visit_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Ticket className="h-4 w-4 text-accent" />
              </div>
              {isArabic ? 'التذاكر' : 'Tickets'}
            </h3>
            <div className="space-y-3">
              {booking.adult_count > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-accent/10 rtl:flex-row-reverse">
                  <span className="text-foreground">{isArabic ? 'بالغ' : 'Adult'} × {booking.adult_count}</span>
                  <span className="font-semibold text-accent">{booking.adult_count * Number(booking.adult_price)} SAR</span>
                </div>
              )}
              {booking.child_count > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-accent/10 rtl:flex-row-reverse">
                  <span className="text-foreground">{isArabic ? 'طفل' : 'Child'} × {booking.child_count}</span>
                  <span className="font-semibold text-accent">{booking.child_count * Number(booking.child_price)} SAR</span>
                </div>
              )}
              {(booking.senior_count || 0) > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-accent/10 rtl:flex-row-reverse">
                  <span className="text-foreground">{isArabic ? 'كبير السن' : 'Senior'} × {booking.senior_count}</span>
                  <span className="font-semibold text-accent">{(booking.senior_count || 0) * Number(booking.senior_price || 0)} SAR</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 rtl:flex-row-reverse">
                <span className="text-lg font-bold text-foreground">{isArabic ? 'المجموع' : 'Total'}</span>
                <span className="text-2xl font-bold text-accent">{booking.total_amount} SAR</span>
              </div>
            </div>
          </div>

          {/* Generated Tickets / QR Codes */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 text-foreground text-start rtl:text-end">
              {isArabic ? 'رموز QR' : 'QR Codes'} ({tickets.length})
            </h3>
            {loadingTickets ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full bg-accent/10" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`rounded-xl p-4 text-center border transition-all ${
                      ticket.is_used 
                        ? 'bg-muted/50 border-muted opacity-60' 
                        : 'bg-background/50 border-accent/20 hover:border-accent/40'
                    }`}
                  >
                    {ticket.qr_code_url && (
                      <img
                        src={ticket.qr_code_url}
                        alt="QR Code"
                        className="w-20 h-20 mx-auto mb-3 rounded-lg"
                      />
                    )}
                    <p className="text-xs font-mono text-muted-foreground mb-2">{ticket.ticket_code}</p>
                    <Badge 
                      variant="outline" 
                      className={ticket.is_used 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-accent/10 text-accent border-accent/30'
                      }
                    >
                      {ticket.is_used 
                        ? (isArabic ? 'مستخدم' : 'Used') 
                        : getTicketTypeLabel(ticket.ticket_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              {isArabic ? 'معلومات الدفع' : 'Payment Information'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'الحالة' : 'Status'}</p>
                <Badge 
                  variant="outline" 
                  className={booking.payment_status === 'completed' 
                    ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-700 border-amber-500/30'
                  }
                >
                  {booking.payment_status}
                </Badge>
              </div>
              <div className="text-start rtl:text-end">
                <p className="text-sm text-muted-foreground">{isArabic ? 'معرف الدفع' : 'Payment ID'}</p>
                <p className="font-mono text-sm text-foreground">{booking.payment_id || '-'}</p>
              </div>
            </div>
          </div>

          {/* Email Status & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-accent/5 to-transparent rtl:bg-gradient-to-l border border-accent/10">
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              {booking.confirmation_email_sent ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MailCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="text-emerald-600 font-medium">
                    {isArabic ? 'تم إرسال البريد الإلكتروني' : 'Email Sent'}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground font-medium">
                    {isArabic ? 'لم يتم إرسال البريد' : 'Email Not Sent'}
                  </span>
                </>
              )}
            </div>
            <Button 
              onClick={handleResendEmail} 
              disabled={resending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              {resending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
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
