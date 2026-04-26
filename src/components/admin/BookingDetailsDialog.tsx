import { useEffect, useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Mail, Phone, Calendar, Clock, Ticket, CreditCard, RefreshCw, MailCheck, X, User, Globe, CheckCircle, Ban, History, Wallet, Search, Undo2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { resendConfirmationEmail } from '@/lib/emailService';
import { markBookingAsPaid, regenerateTickets } from '@/lib/manualPaymentService';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Heavy children — only download/parse when their section is opened
const EmailStatusTracker = lazy(() => import('./EmailStatusTracker'));
const PaymentHistoryPanel = lazy(() => import('./PaymentHistoryPanel'));

const PanelFallback = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-1/3 bg-accent/10" />
    <Skeleton className="h-16 w-full bg-accent/10" />
  </div>
);

const SectionErrorFallback = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive text-center">
    {label}
  </div>
);

type Booking = Tables<'bookings'>;
type TicketType = Tables<'tickets'>;

interface MoyasarVerification {
  moyasar: {
    id: string;
    status: string;
    amount: number;
    amount_format: string;
    fee?: number;
    fee_format?: string;
    refunded?: number;
    refunded_format?: string;
    currency: string;
    created_at: string;
    source?: {
      type: string;
      company?: string;
      name?: string;
      number?: string;
    };
  };
  database: {
    payment_status: string;
    payment_id: string;
    total_amount: number;
    paid_at: string | null;
  } | null;
  comparison: {
    status_match: boolean;
    amount_match: boolean;
    discrepancy: string | null;
  } | null;
}

interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated?: () => void;
}

const BookingDetailsDialog = ({ booking, open, onOpenChange, onBookingUpdated }: BookingDetailsDialogProps) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Lazy-mount heavy collapsible panels only after user opens them
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [moyasarOpen, setMoyasarOpen] = useState(false);
  const [orphanOpen, setOrphanOpen] = useState(false);

  // Defer rendering of heavy lower sections to keep first paint fast on tablets
  const [secondaryReady, setSecondaryReady] = useState(false);

  // QR grid: cap initial render to 12 thumbnails on big group bookings
  const [showAllQR, setShowAllQR] = useState(false);

  // Moyasar verification state
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<MoyasarVerification | null>(null);
  
  // Refund state
  const [refunding, setRefunding] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  // Find orphan payment state
  const [searchingPayment, setSearchingPayment] = useState(false);
  const [foundPayments, setFoundPayments] = useState<any[]>([]);
  const [linkingPayment, setLinkingPayment] = useState<string | null>(null);

  // Reset transient state and refetch tickets only when the booking id or open state actually changes
  useEffect(() => {
    if (booking && open) {
      fetchTickets();
      setVerification(null);
      setEmailHistoryOpen(false);
      setPaymentHistoryOpen(false);
      setMoyasarOpen(false);
      setOrphanOpen(false);
      setShowAllQR(false);
      setSecondaryReady(false);
      // Defer heavy lower sections until after the dialog has painted
      const t = setTimeout(() => setSecondaryReady(true), 80);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, open]);

  // Verify Moyasar payment status
  const handleVerifyPayment = async () => {
    if (!booking?.payment_id) {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'لا يوجد معرف دفع' : 'No payment ID available', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-moyasar-status', {
        body: { paymentId: booking.payment_id, bookingId: booking.id }
      });
      if (error) throw error;
      setVerification(data);
      toast({ title: isArabic ? 'تم التحقق' : 'Verified', description: isArabic ? 'تم جلب حالة الدفع من Moyasar' : 'Payment status fetched from Moyasar' });
    } catch (err) {
      console.error('Verification error:', err);
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل التحقق من الدفع' : 'Failed to verify payment', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  // Process refund
  const handleProcessRefund = async () => {
    if (!booking?.payment_id) return;
    setRefunding(true);
    try {
      // Send amount in SAR (edge function handles conversion to halalas)
      const amountInSar = refundAmount.trim() ? Number.parseFloat(refundAmount) : undefined;
      if (refundAmount.trim() && (!Number.isFinite(amountInSar) || amountInSar <= 0)) {
        toast({
          title: isArabic ? 'خطأ' : 'Error',
          description: isArabic ? 'مبلغ الاسترداد غير صالح' : 'Invalid refund amount',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { bookingId: booking.id, amount: amountInSar, reason: 'Admin initiated refund' }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: isArabic ? 'تم الاسترداد' : 'Refunded', description: isArabic ? 'تم استرداد المبلغ بنجاح' : 'Refund processed successfully' });
      setShowRefundDialog(false);
      onBookingUpdated?.();
    } catch (err) {
      console.error('Refund error:', err);
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل في معالجة الاسترداد' : 'Failed to process refund', variant: 'destructive' });
    } finally {
      setRefunding(false);
    }
  };

  // Search for orphan payments in Moyasar
  const handleSearchOrphanPayment = async () => {
    if (!booking) return;
    setSearchingPayment(true);
    setFoundPayments([]);
    try {
      const visitDate = new Date(booking.visit_date);
      const dateFrom = new Date(booking.created_at || visitDate);
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date(visitDate);
      dateTo.setDate(dateTo.getDate() + 1);

      const { data, error } = await supabase.functions.invoke('search-moyasar-payments', {
        body: { 
          email: booking.customer_email,
          amount: booking.total_amount,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        }
      });
      if (error) throw error;
      setFoundPayments(data.payments || []);
      if ((data.payments || []).length === 0) {
        toast({ title: isArabic ? 'لا توجد نتائج' : 'No Results', description: isArabic ? 'لم يتم العثور على مدفوعات مطابقة' : 'No matching payments found in Moyasar' });
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل البحث' : 'Failed to search', variant: 'destructive' });
    } finally {
      setSearchingPayment(false);
    }
  };

  // Link orphan payment to booking
  const handleLinkPayment = async (paymentId: string) => {
    if (!booking) return;
    setLinkingPayment(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke('link-orphan-payment', {
        body: { bookingId: booking.id, paymentId }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: isArabic ? 'تم الربط' : 'Linked', description: isArabic ? 'تم ربط الدفع وإنشاء التذاكر' : 'Payment linked and tickets generated!' });
      setFoundPayments([]);
      onBookingUpdated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: err.message || (isArabic ? 'فشل الربط' : 'Failed to link'), variant: 'destructive' });
    } finally {
      setLinkingPayment(null);
    }
  };

  const fetchTickets = async () => {
    if (!booking) return;
    setLoadingTickets(true);
    setTicketsError(null);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('booking_id', booking.id);
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTicketsError(isArabic ? 'فشل تحميل التذاكر' : 'Failed to load tickets');
      setTickets([]);
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

  const handleMarkAsPaid = async () => {
    if (!booking) return;
    setMarkingPaid(true);
    try {
      const result = await markBookingAsPaid(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({ 
        title: isArabic ? 'تم التحديث' : 'Updated', 
        description: isArabic ? 'تم تحديث حالة الدفع وإنشاء التذاكر' : 'Payment marked as paid and tickets generated' 
      });
      onBookingUpdated?.();
      onOpenChange(false);
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    } finally {
      setMarkingPaid(false);
    }
  };

  const [regenerating, setRegenerating] = useState(false);
  
  const handleRegenerateTickets = async () => {
    if (!booking) return;
    setRegenerating(true);
    try {
      const result = await regenerateTickets(booking.id);
      if (!result.success) throw new Error(result.error);
      toast({ 
        title: isArabic ? 'تم الإنشاء' : 'Generated', 
        description: isArabic ? 'تم إنشاء التذاكر وإرسال البريد' : 'Tickets generated and email sent' 
      });
      fetchTickets();
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل إنشاء التذاكر' : 'Failed to generate tickets', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (error) throw error;
      toast({ title: isArabic ? 'تم الإلغاء' : 'Cancelled', description: isArabic ? 'تم إلغاء الحجز' : 'Booking cancelled' });
      onBookingUpdated?.();
      onOpenChange(false);
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل الإلغاء' : 'Failed to cancel', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) return null;

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isArabic ? ar : enUS });
  };

  const formatFullDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return format(date, 'PPP, h:mm:ss a', { locale: isArabic ? ar : enUS });
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
      <DialogContent
        aria-describedby="booking-details-desc"
        className="w-[95vw] sm:w-full max-w-2xl max-h-[88vh] overflow-y-auto glass-card border-accent/20 pt-10"
      >
        <DialogHeader className="pb-4 border-b border-accent/10 pe-12">
          <DialogTitle className="flex items-center justify-between rtl:flex-row-reverse">
            <span className="text-xl font-bold text-foreground">{isArabic ? 'تفاصيل الحجز' : 'Booking Details'}</span>
            <Badge variant="outline" className={getStatusConfig(booking.booking_status).className}>
              {getStatusConfig(booking.booking_status).label}
            </Badge>
          </DialogTitle>
          <DialogDescription id="booking-details-desc" className="sr-only">
            {isArabic ? 'تفاصيل الحجز والتذاكر والدفع' : 'Booking, ticket and payment details'}
          </DialogDescription>
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

          {/* Transaction Timeline */}
          <div className="glass-card rounded-xl p-5 border border-accent/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground rtl:flex-row-reverse rtl:justify-end">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              {isArabic ? 'الجدول الزمني' : 'Transaction Timeline'}
            </h3>
            <div className="space-y-4">
              {/* Visit Date */}
              <div className="flex items-start gap-3 rtl:flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
                <div className="text-start rtl:text-end">
                  <p className="text-sm text-muted-foreground">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</p>
                  <p className="font-medium text-foreground">{formatDate(booking.visit_date)}</p>
                </div>
              </div>
              
              {/* Booking Created */}
              <div className="flex items-start gap-3 rtl:flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-start rtl:text-end">
                  <p className="text-sm text-muted-foreground">{isArabic ? 'تم إنشاء الحجز' : 'Booking Created'}</p>
                  <p className="font-medium text-foreground">{formatFullDateTime(booking.created_at)}</p>
                </div>
              </div>
              
              {/* Payment Completed */}
              {booking.paid_at && (
                <div className="flex items-start gap-3 rtl:flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-start rtl:text-end">
                    <p className="text-sm text-muted-foreground">{isArabic ? 'تم الدفع' : 'Payment Completed'}</p>
                    <p className="font-medium text-emerald-600">{formatFullDateTime(booking.paid_at)}</p>
                  </div>
                </div>
              )}
              
              {/* Cancelled At */}
              {booking.cancelled_at && (
                <div className="flex items-start gap-3 rtl:flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-start rtl:text-end">
                    <p className="text-sm text-muted-foreground">{isArabic ? 'تم الإلغاء' : 'Cancelled At'}</p>
                    <p className="font-medium text-red-600">{formatFullDateTime(booking.cancelled_at)}</p>
                  </div>
                </div>
              )}
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
            <div className="flex items-center justify-between mb-4 rtl:flex-row-reverse">
              <h3 className="font-semibold text-foreground text-start rtl:text-end">
                {isArabic ? 'رموز QR' : 'QR Codes'} ({tickets.length})
              </h3>
              {booking.payment_status === 'completed' && (tickets.length === 0 || !booking.qr_codes_generated) && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRegenerateTickets}
                  disabled={regenerating}
                  className="gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {regenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
                  {isArabic ? 'إنشاء التذاكر' : 'Generate Tickets'}
                </Button>
              )}
            </div>
            {loadingTickets ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full bg-accent/10" />
                ))}
              </div>
            ) : ticketsError ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive">{ticketsError}</p>
                <Button size="sm" variant="outline" onClick={fetchTickets}>
                  {isArabic ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isArabic ? 'لا توجد تذاكر بعد' : 'No tickets yet'}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(showAllQR ? tickets : tickets.slice(0, 12)).map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`rounded-xl p-4 text-center border min-w-0 ${
                        ticket.is_used
                          ? 'bg-muted/50 border-muted opacity-60'
                          : 'bg-background/50 border-accent/20'
                      }`}
                    >
                      {ticket.qr_code_url && (
                        <img
                          src={ticket.qr_code_url}
                          alt="QR Code"
                          loading="lazy"
                          decoding="async"
                          width={80}
                          height={80}
                          className="w-20 h-20 mx-auto mb-3 rounded-lg max-w-full object-contain"
                        />
                      )}
                      <p className="text-xs font-mono text-muted-foreground mb-2 break-all">{ticket.ticket_code}</p>
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
                {tickets.length > 12 && !showAllQR && (
                  <div className="mt-4 text-center">
                    <Button size="sm" variant="outline" onClick={() => setShowAllQR(true)}>
                      {isArabic
                        ? `عرض كل التذاكر (${tickets.length})`
                        : `Show all tickets (${tickets.length})`}
                    </Button>
                  </div>
                )}
              </>
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

            {/* Payment History Collapsible — only mounts the panel when expanded */}
            <Collapsible open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between gap-2">
                  <span className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Wallet className="h-4 w-4" />
                    {isArabic ? 'سجل المدفوعات' : 'Payment History'}
                  </span>
                  <History className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {paymentHistoryOpen && (
                  <ErrorBoundary fallback={<SectionErrorFallback label={isArabic ? 'فشل تحميل سجل المدفوعات' : 'Failed to load payment history'} />}>
                    <Suspense fallback={<PanelFallback />}>
                      <PaymentHistoryPanel bookingId={booking.id} />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Secondary sections — deferred to keep first paint fast on tablets */}
          {!secondaryReady ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full bg-accent/10" />
              <Skeleton className="h-16 w-full bg-accent/10" />
            </div>
          ) : (
            <ErrorBoundary fallback={<SectionErrorFallback label={isArabic ? 'تعذر تحميل بعض الأقسام' : 'Some sections failed to load'} />}>
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

              {/* Email History (lazy-mounted) */}
              <Collapsible open={emailHistoryOpen} onOpenChange={setEmailHistoryOpen} className="glass-card rounded-xl p-5 border border-accent/10 mt-6">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between gap-2">
                    <span className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <History className="h-4 w-4 text-blue-600" />
                      </div>
                      {isArabic ? 'سجل البريد الإلكتروني' : 'Email History'}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  {emailHistoryOpen && (
                    <ErrorBoundary fallback={<SectionErrorFallback label={isArabic ? 'فشل تحميل سجل البريد' : 'Failed to load email history'} />}>
                      <Suspense fallback={<PanelFallback />}>
                        <EmailStatusTracker bookingId={booking.id} />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Find Orphan Payment - Only show when payment_id is null */}
              {!booking.payment_id && booking.payment_status !== 'completed' && (
                <div className="glass-card rounded-xl p-5 border border-amber-500/30 bg-amber-500/5 mt-6">
                  <div className="flex items-center justify-between mb-4 rtl:flex-row-reverse">
                    <h3 className="font-semibold flex items-center gap-2 text-foreground rtl:flex-row-reverse">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                      {isArabic ? 'البحث عن دفع مفقود' : 'Find Lost Payment'}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSearchOrphanPayment}
                      disabled={searchingPayment}
                      className="gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                    >
                      {searchingPayment ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      {isArabic ? 'بحث في Moyasar' : 'Search Moyasar'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isArabic ? 'ابحث عن مدفوعات في Moyasar قد تكون مرتبطة بهذا الحجز' : 'Search for payments in Moyasar that may belong to this booking'}
                  </p>

                  {foundPayments.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium">{isArabic ? 'المدفوعات الموجودة:' : 'Found Payments:'}</p>
                      {foundPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                          <div className="text-sm">
                            <p className="font-mono text-xs text-muted-foreground">{p.id}</p>
                            <p className="font-medium">{p.amount} SAR - <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge></p>
                            {p.isLinked && <p className="text-xs text-amber-600">{isArabic ? 'مرتبط بـ' : 'Linked to'} {p.linkedBookingRef}</p>}
                          </div>
                          {p.status === 'paid' && !p.isLinked && (
                            <Button
                              size="sm"
                              onClick={() => handleLinkPayment(p.id)}
                              disabled={linkingPayment === p.id}
                              className="gap-1"
                            >
                              {linkingPayment === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              {isArabic ? 'ربط' : 'Link'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Moyasar Verification Panel */}
              {booking.payment_id && (
                <div className="glass-card rounded-xl p-5 border border-accent/10 mt-6">
                  <div className="flex items-center justify-between mb-4 rtl:flex-row-reverse">
                    <h3 className="font-semibold flex items-center gap-2 text-foreground rtl:flex-row-reverse">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Search className="h-4 w-4 text-indigo-600" />
                      </div>
                      {isArabic ? 'التحقق من Moyasar' : 'Moyasar Verification'}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVerifyPayment}
                      disabled={verifying}
                      className="gap-2"
                    >
                      {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      {isArabic ? 'تحقق' : 'Verify'}
                    </Button>
                  </div>

                  {verification && (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-start rtl:text-end">
                          <p className="text-muted-foreground">{isArabic ? 'الحالة في Moyasar' : 'Moyasar Status'}</p>
                          <Badge className={verification.moyasar.status === 'paid' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-amber-500/20 text-amber-700'}>
                            {verification.moyasar.status}
                          </Badge>
                        </div>
                        <div className="text-start rtl:text-end">
                          <p className="text-muted-foreground">{isArabic ? 'المبلغ' : 'Amount'}</p>
                          <p className="font-medium">{verification.moyasar.amount_format}</p>
                        </div>
                      </div>
                      {verification.moyasar.refunded && verification.moyasar.refunded > 0 && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-amber-700 font-medium">
                            {isArabic ? 'المبلغ المسترد:' : 'Refunded:'} {verification.moyasar.refunded_format}
                          </p>
                        </div>
                      )}
                      {verification.comparison?.discrepancy && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 rtl:flex-row-reverse">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="text-red-700">{verification.comparison.discrepancy}</p>
                        </div>
                      )}
                      {verification.moyasar.source && (
                        <div className="text-start rtl:text-end">
                          <p className="text-muted-foreground">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</p>
                          <p className="font-medium">
                            {verification.moyasar.source.type} - {verification.moyasar.source.company} ****{verification.moyasar.source.number}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Actions for pending payments */}
              {booking.payment_status === 'pending' && booking.booking_status !== 'cancelled' && (
                <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-6">
                  <Button
                    onClick={handleMarkAsPaid}
                    disabled={markingPaid}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {markingPaid ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {isArabic ? 'تأكيد الدفع' : 'Mark as Paid'}
                  </Button>
                  <Button
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    {cancelling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    {isArabic ? 'إلغاء الحجز' : 'Cancel Booking'}
                  </Button>
                </div>
              )}

              {/* Refund Actions for completed payments */}
              {booking.payment_status === 'completed' && booking.payment_id && (
                <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mt-6">
                  <Button
                    onClick={handleVerifyPayment}
                    disabled={verifying}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    {verifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isArabic ? 'التحقق من الدفع' : 'Verify Payment'}
                  </Button>
                  <Button
                    onClick={() => {
                      setRefundAmount(String(booking.total_amount));
                      setShowRefundDialog(true);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    {isArabic ? 'معالجة الاسترداد' : 'Process Refund'}
                  </Button>
                </div>
              )}
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <Undo2 className="h-5 w-5 text-amber-600" />
              {isArabic ? 'تأكيد الاسترداد' : 'Confirm Refund'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? 'سيتم استرداد المبلغ للعميل عبر Moyasar. هذا الإجراء لا يمكن التراجع عنه.'
                : 'The amount will be refunded to the customer via Moyasar. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                {isArabic ? 'مبلغ الاسترداد (ريال)' : 'Refund Amount (SAR)'}
              </label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={booking.total_amount}
                min={1}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isArabic ? 'المبلغ الكامل:' : 'Full amount:'} {booking.total_amount} SAR
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 flex items-center gap-2 rtl:flex-row-reverse">
                <AlertTriangle className="h-4 w-4" />
                {isArabic 
                  ? 'سيتم إرسال إشعار بالاسترداد للعميل عبر البريد الإلكتروني'
                  : 'A refund notification will be sent to the customer via email'}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProcessRefund}
              disabled={refunding || !refundAmount || parseFloat(refundAmount) <= 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {refunding ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : null}
              {isArabic ? 'تأكيد الاسترداد' : 'Process Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default BookingDetailsDialog;
