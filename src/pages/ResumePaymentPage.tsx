import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Users, CreditCard, AlertCircle, CheckCircle, Lock, ArrowLeft, Home } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { MoyasarPayment } from '@/types/moyasar.d';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Z4WZcnyWGhaDva7QgnBdb53DWzokQmiCATjFmST2';

const ResumePaymentPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const moyasarInitialized = useRef(false);

  // Fetch booking details
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError(isArabic ? 'رقم الحجز غير صالح' : 'Invalid booking ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (fetchError || !data) {
          setError(isArabic ? 'لم يتم العثور على الحجز' : 'Booking not found');
          setLoading(false);
          return;
        }

        // Check if already paid
        if (data.payment_status === 'completed') {
          navigate(`/confirmation/${bookingId}`, { replace: true });
          return;
        }

        // Check if cancelled
        if (data.booking_status === 'cancelled') {
          setError(isArabic ? 'تم إلغاء هذا الحجز' : 'This booking has been cancelled');
          setLoading(false);
          return;
        }

        setBooking(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading booking data');
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate, isArabic]);

  // Initialize Moyasar payment form
  const initializeMoyasar = useCallback(() => {
    if (!booking || moyasarInitialized.current || !window.Moyasar) {
      console.error('Moyasar SDK not loaded or already initialized');
      return;
    }

    const amountInHalalas = Math.round(booking.total_amount * 100);
    const PRODUCTION_DOMAIN = 'https://almufaijer.com';
    const callbackUrl = `${PRODUCTION_DOMAIN}/payment-callback/${booking.id}`;

    console.log('Initializing Moyasar for resume payment:', { 
      amount: amountInHalalas, 
      bookingId: booking.id, 
      callbackUrl 
    });

    try {
      window.Moyasar.init({
        element: '#moyasar-resume-mount',
        amount: amountInHalalas,
        currency: 'SAR',
        description: `Souq Almufaijer Ticket - ${booking.booking_reference}`,
        publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
        callback_url: callbackUrl,
        methods: ['creditcard'],
        supported_networks: ['visa', 'mastercard', 'mada', 'amex'],
        language: isArabic ? 'ar' : 'en',
        fixed_width: true,
        on_completed: (payment: MoyasarPayment) => {
          console.log('on_completed fired:', payment.id, payment.status, payment.source?.transaction_url);
          
          // Handle 3D Secure / bank verification
          if (payment.status === 'initiated' && payment.source?.transaction_url) {
            console.log('3DS required, redirecting to:', payment.source.transaction_url);
            window.location.href = payment.source.transaction_url;
            return;
          }
          
          // Payment completed - redirect to callback
          console.log('Payment completed, forcing redirect');
          const redirectUrl = `${PRODUCTION_DOMAIN}/payment-callback/${booking.id}?id=${payment.id}&status=${payment.status}`;
          window.location.href = redirectUrl;
        },
        on_failure: (error: any) => {
          console.error('Payment failed:', {
            type: error?.type,
            message: error?.message,
            code: error?.code,
            full_error: JSON.stringify(error, null, 2)
          });
          toast({
            title: isArabic ? 'فشل الدفع' : 'Payment Failed',
            description: `${error?.type || 'Error'}: ${error?.message || (isArabic ? 'حدث خطأ في عملية الدفع' : 'An error occurred during payment')}`,
            variant: 'destructive',
          });
        },
      });

      moyasarInitialized.current = true;
    } catch (error) {
      console.error('Failed to initialize Moyasar:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تهيئة نظام الدفع' : 'Failed to initialize payment system',
        variant: 'destructive',
      });
    }
  }, [booking, isArabic, toast]);

  const handleProceedToPayment = () => {
    setShowPaymentForm(true);
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      initializeMoyasar();
    });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              {isArabic ? 'حدث خطأ' : 'Error'}
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link to="/">
                <Home className="h-4 w-4 me-2" />
                {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) return null;

  const totalGuests = booking.adult_count + booking.child_count + (booking.senior_count || 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        <div className="container max-w-2xl mx-auto">
          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {isArabic ? 'أكمل عملية الدفع' : 'Complete Your Payment'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? 'حجزك في انتظار الدفع. أكمل الدفع الآن لتأكيد حجزك.'
                : 'Your booking is pending payment. Complete payment now to confirm your reservation.'}
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="glass-card border border-accent/30 rounded-2xl p-6 mb-8">
            <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              {isArabic ? 'تفاصيل الحجز' : 'Booking Details'}
            </h2>

            <div className="space-y-4">
              {/* Booking Reference */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-muted-foreground text-sm">
                  {isArabic ? 'رقم الحجز' : 'Booking Reference'}
                </span>
                <span className="font-mono font-bold text-accent text-lg">
                  {booking.booking_reference}
                </span>
              </div>

              {/* Visit Date */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</span>
                </div>
                <span className="font-medium text-foreground">
                  {formatDate(booking.visit_date)}
                </span>
              </div>

              {/* Visit Time */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{isArabic ? 'وقت الزيارة' : 'Visit Time'}</span>
                </div>
                <span className="font-medium text-foreground">
                  {booking.visit_time}
                </span>
              </div>

              {/* Guests */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{isArabic ? 'عدد الضيوف' : 'Guests'}</span>
                </div>
                <span className="font-medium text-foreground">
                  {totalGuests} {isArabic ? 'ضيف' : 'Guest(s)'}
                </span>
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-between py-4 bg-accent/10 rounded-xl px-4 -mx-2">
                <span className="font-semibold text-foreground">
                  {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-accent">
                  {booking.total_amount} <span className="text-base">{isArabic ? 'ر.س' : 'SAR'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          {!showPaymentForm ? (
            <div className="space-y-4">
              <Button
                size="lg"
                onClick={handleProceedToPayment}
                className="w-full h-14 text-lg rounded-xl btn-gold"
              >
                <CreditCard className="h-5 w-5 me-2" />
                {isArabic ? 'المتابعة للدفع' : 'Proceed to Payment'}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>{isArabic ? 'دفع آمن ومشفر' : 'Secure & encrypted payment'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Moyasar Mount - always rendered with ID selector for Safari compatibility */}
              <div 
                id="moyasar-resume-mount"
                className="moyasar-form rounded-2xl overflow-hidden bg-card p-6 border-2 border-border shadow-lg"
                style={{ minHeight: '320px' }}
              />
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>{isArabic ? 'دفع آمن عبر Moyasar' : 'Secure payment via Moyasar'}</span>
              </div>
            </div>
          )}

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            {isArabic 
              ? 'تواجه مشكلة؟ تواصل معنا على info@almufaijer.com'
              : 'Having trouble? Contact us at info@almufaijer.com'}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResumePaymentPage;
