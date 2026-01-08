import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Users, CreditCard, AlertCircle, CheckCircle, Lock, ArrowLeft, Home, AlertTriangle, Loader2 } from 'lucide-react';
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

const MOYASAR_PUBLISHABLE_KEY = 'pk_live_LfPdUccwaeh8SBpL9rbj8FpDshb2QahMUDnVurfT';

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
  const [moyasarError, setMoyasarError] = useState<string | null>(null);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const [moyasarTimeout, setMoyasarTimeout] = useState(false);
  const moyasarInitialized = useRef(false);
  const moyasarReadyRef = useRef(false); // Track readiness with ref to avoid stale closures
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  
  // Debug mode - append ?debug=1 to URL to see diagnostics
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

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
    // Clear any previous errors
    setMoyasarError(null);
    
    if (!booking) {
      console.error('No booking data available');
      return;
    }

    // Log comprehensive diagnostic info
    const diagnosticInfo = {
      sdkLoaded: typeof window.Moyasar !== 'undefined',
      sdkType: typeof window.Moyasar,
      hasInit: typeof window.Moyasar?.init === 'function',
      container: document.getElementById('moyasar-resume-mount') ? 'exists' : 'missing',
      domain: window.location.hostname,
      publishableKey: `...${MOYASAR_PUBLISHABLE_KEY.slice(-8)}`,
      bookingId: booking.id,
      timestamp: new Date().toISOString(),
    };
    console.log('Moyasar diagnostic info (Resume):', diagnosticInfo);

    // Check if already initialized
    if (moyasarInitialized.current) {
      console.warn('Moyasar already initialized, skipping');
      return;
    }

    // Check if SDK loaded
    if (typeof window.Moyasar === 'undefined') {
      const errorMsg = 'Moyasar SDK failed to load from CDN. Please check your internet connection and refresh the page.';
      console.error(errorMsg, diagnosticInfo);
      setMoyasarError(errorMsg);
      return;
    }

    // Check if init function exists
    if (typeof window.Moyasar.init !== 'function') {
      const errorMsg = 'Moyasar SDK loaded but init() not available. SDK may be corrupted.';
      console.error(errorMsg, diagnosticInfo);
      setMoyasarError(errorMsg);
      return;
    }

    // Check if mount container exists
    const container = document.getElementById('moyasar-resume-mount');
    if (!container) {
      const errorMsg = 'Payment form container not found in DOM.';
      console.error(errorMsg, diagnosticInfo);
      setMoyasarError(errorMsg);
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
      console.log('Moyasar.init() called successfully (Resume), setting up MutationObserver');
      
      // Use MutationObserver to reliably detect form injection
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new MutationObserver((mutations) => {
        const formEl = paymentFormRef.current;
        if (formEl && formEl.querySelector('form, iframe, input')) {
          console.log('MutationObserver: Moyasar form elements detected (Resume)');
          moyasarReadyRef.current = true;
          setMoyasarReady(true);
          observerRef.current?.disconnect();
        }
      });

      if (container) {
        observerRef.current.observe(container, {
          childList: true,
          subtree: true,
        });
      }

      // Also check immediately in case elements already injected
      if (container.querySelector('form, iframe, input')) {
        console.log('Moyasar form elements already present (Resume)');
        moyasarReadyRef.current = true;
        setMoyasarReady(true);
        observerRef.current?.disconnect();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('Failed to initialize Moyasar:', error);
      setMoyasarError(errorMsg);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تهيئة نظام الدفع' : 'Failed to initialize payment system',
        variant: 'destructive',
      });
    }
  }, [booking, isArabic, toast]);

  const handleProceedToPayment = () => {
    setShowPaymentForm(true);
    setMoyasarReady(false);
    moyasarReadyRef.current = false;
    setMoyasarTimeout(false);
    setMoyasarError(null);
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      initializeMoyasar();
    });
    
    // Set timeout fallback - use ref to get current value
    setTimeout(() => {
      if (!moyasarReadyRef.current) {
        console.warn('Moyasar 12s timeout triggered (Resume) - form did not load');
        setMoyasarTimeout(true);
      }
    }, 12000);
  };
  
  const handleRetryMoyasar = () => {
    moyasarInitialized.current = false;
    moyasarReadyRef.current = false;
    setMoyasarTimeout(false);
    setMoyasarReady(false);
    setMoyasarError(null);
    observerRef.current?.disconnect();
    // Clear the form container
    if (paymentFormRef.current) {
      paymentFormRef.current.innerHTML = '';
    }
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
              {/* Debug Panel */}
              {isDebugMode && (
                <div className="mb-4 p-4 bg-muted border border-border rounded-xl font-mono text-xs space-y-1">
                  <p className="font-bold text-foreground mb-2">🔧 Moyasar Debug Panel (Resume)</p>
                  <p>SDK Loaded: <span className={typeof window.Moyasar !== 'undefined' ? 'text-green-600' : 'text-red-600'}>{typeof window.Moyasar !== 'undefined' ? 'Yes' : 'No'}</span></p>
                  <p>SDK init(): <span className={typeof window.Moyasar?.init === 'function' ? 'text-green-600' : 'text-red-600'}>{typeof window.Moyasar?.init === 'function' ? 'Available' : 'Missing'}</span></p>
                  <p>Publishable Key: ...{MOYASAR_PUBLISHABLE_KEY.slice(-8)}</p>
                  <p>Domain: {window.location.hostname}</p>
                  <p>Mount Container: <span className={document.getElementById('moyasar-resume-mount') ? 'text-green-600' : 'text-red-600'}>{document.getElementById('moyasar-resume-mount') ? 'Exists' : 'Missing'}</span></p>
                  <p>Form Ready: <span className={moyasarReady ? 'text-green-600' : 'text-amber-600'}>{moyasarReady ? 'Yes' : 'Loading...'}</span></p>
                  <p>Init Started: {moyasarInitialized.current ? 'Yes' : 'No'}</p>
                  {moyasarError && <p className="text-red-600">Error: {moyasarError}</p>}
                  {booking && <p>Booking ID: {booking.id.slice(0, 8)}...</p>}
                </div>
              )}

              {/* Moyasar Error Display */}
              {moyasarError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        {isArabic ? 'فشل تحميل نموذج الدفع' : 'Payment form failed to load'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-300">{moyasarError}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" onClick={handleRetryMoyasar} className="gap-2">
                          <Loader2 className="h-4 w-4" />
                          {isArabic ? 'إعادة المحاولة' : 'Retry Payment'}
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer">
                            {isArabic ? 'تواصل مع الدعم' : 'Contact Support'}
                          </a>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {isArabic ? 'رقم الحجز:' : 'Booking Ref:'} <span className="font-mono font-bold">{booking.booking_reference}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Form Container */}
              <div className="relative rounded-2xl overflow-hidden bg-card border-2 border-border shadow-lg">
                {/* Loading overlay */}
                {!moyasarReady && !moyasarError && (
                  <div className="absolute inset-0 z-10 bg-card p-6">
                    {moyasarTimeout ? (
                      <div className="text-center space-y-4 h-full flex flex-col items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p className="text-muted-foreground">
                          {isArabic ? 'تأخر تحميل نموذج الدفع. يرجى المحاولة مرة أخرى.' : 'Payment form is taking longer than expected.'}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button onClick={handleRetryMoyasar} variant="outline" className="gap-2">
                            <Loader2 className="h-4 w-4" />
                            {isArabic ? 'إعادة المحاولة' : 'Retry'}
                          </Button>
                          <Button variant="outline" asChild>
                            <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer">
                              {isArabic ? 'تواصل مع الدعم' : 'Contact Support'}
                            </a>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'رقم الحجز:' : 'Booking Ref:'} <span className="font-mono font-bold">{booking.booking_reference}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="animate-pulse">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <Loader2 className="h-5 w-5 animate-spin text-accent" />
                          <span className="text-muted-foreground font-medium">
                            {isArabic ? 'جاري تحضير الدفع الآمن...' : 'Preparing secure payment...'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-14 bg-muted rounded-xl" />
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="h-4 w-28 bg-muted rounded" />
                          <div className="h-14 bg-muted rounded-xl" />
                        </div>
                        <div className="h-16 bg-muted rounded-xl mt-4" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Moyasar Mount */}
                <div 
                  id="moyasar-resume-mount"
                  ref={paymentFormRef}
                  className="moyasar-form p-6"
                  style={{ minHeight: '320px' }}
                />
              </div>
              
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
