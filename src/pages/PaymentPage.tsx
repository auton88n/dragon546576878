import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, CreditCard, Shield, Lock, ExternalLink, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { MoyasarPayment } from '@/types/moyasar.d';

const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Ah7AU1kvj5r64sAV369hkXhVuNi6bmAmVt1Pf1ZN';
const PRODUCTION_DOMAIN = 'https://almufaijer.com';
const ALLOWED_DOMAINS = ['almufaijer.com', 'tickets.almufaijer.com', 'localhost'];
const SDK_LOAD_TIMEOUT_MS = 12000; // 12 seconds

interface BookingDetails {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  payment_status?: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
}

interface LocationState {
  booking?: BookingDetails;
}

type InitPhase = 'idle' | 'waiting_mount' | 'initializing' | 'waiting_injection' | 'ready' | 'timeout' | 'error';

const PaymentPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();

  const isDebugMode = searchParams.get('debug') === '1';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAllowedDomain = ALLOWED_DOMAINS.some(d => currentHostname.includes(d) || currentHostname === 'localhost');

  // Get booking from navigation state (passed from DetailsAndPayment)
  const locationState = location.state as LocationState | null;
  const bookingFromState = locationState?.booking;

  const [booking, setBooking] = useState<BookingDetails | null>(bookingFromState || null);
  const [loading, setLoading] = useState(!bookingFromState);
  const [error, setError] = useState<string | null>(null);
  const [isMoyasarReady, setIsMoyasarReady] = useState(false);
  const [moyasarError, setMoyasarError] = useState<string | null>(null);
  const [submissionStalled, setSubmissionStalled] = useState(false);
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);
  const [sdkLoadTimeout, setSdkLoadTimeout] = useState(false);
  const [initPhase, setInitPhase] = useState<InitPhase>('idle');

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    sdkLoaded: false,
    mountExists: false,
    mountChildCount: 0,
    lastCheck: '',
  });

  const moyasarInitStarted = useRef(false);
  const submissionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sdkLoadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update debug info periodically
  const updateDebugInfo = useCallback(() => {
    const mount = document.getElementById('moyasar-mount');
    setDebugInfo({
      sdkLoaded: typeof window.Moyasar !== 'undefined',
      mountExists: !!mount,
      mountChildCount: mount?.children.length || 0,
      lastCheck: new Date().toLocaleTimeString(),
    });
  }, []);

  // Only fetch if we don't have booking data from navigation state
  useEffect(() => {
    if (bookingFromState) {
      if (bookingFromState.id !== bookingId) {
        setError(isArabic ? 'معرف الحجز غير متطابق' : 'Booking ID mismatch');
        setLoading(false);
        return;
      }
      setBooking(bookingFromState);
      setLoading(false);
      return;
    }

    if (!bookingId) {
      setError(isArabic ? 'معرف الحجز غير صالح' : 'Invalid booking ID');
    } else {
      setError(isArabic ? 'انتهت صلاحية بيانات الحجز. يرجى إعادة الحجز.' : 'Booking session expired. Please start a new booking.');
    }
    setLoading(false);
  }, [bookingId, bookingFromState, isArabic]);

  // Check if mount has SDK elements injected
  const checkMountHasElements = useCallback(() => {
    const mount = document.getElementById('moyasar-mount');
    if (!mount) return false;
    // Check for form, iframe, or any input elements
    return !!(mount.querySelector('form, iframe, input') || mount.children.length > 0);
  }, []);

  // Start polling for SDK injection
  const startInjectionPolling = useCallback(() => {
    setInitPhase('waiting_injection');
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 100ms
    pollingIntervalRef.current = setInterval(() => {
      if (checkMountHasElements()) {
        console.log('SDK elements detected via polling');
        setIsMoyasarReady(true);
        setInitPhase('ready');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (sdkLoadTimerRef.current) {
          clearTimeout(sdkLoadTimerRef.current);
          sdkLoadTimerRef.current = null;
        }
      }
      updateDebugInfo();
    }, 100);

    // Set timeout for SDK load failure
    sdkLoadTimerRef.current = setTimeout(() => {
      if (!isMoyasarReady) {
        console.error('SDK load timeout - no elements injected within', SDK_LOAD_TIMEOUT_MS, 'ms');
        setInitPhase('timeout');
        setSdkLoadTimeout(true);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, SDK_LOAD_TIMEOUT_MS);
  }, [checkMountHasElements, isMoyasarReady, updateDebugInfo]);

  // Initialize Moyasar once booking is loaded
  const initializeMoyasar = useCallback(() => {
    if (!booking || moyasarInitStarted.current || !isAllowedDomain) return;

    setInitPhase('waiting_mount');
    updateDebugInfo();

    const container = document.getElementById('moyasar-mount');
    if (!container) {
      console.error('Mount container not found');
      setMoyasarError(isArabic ? 'لم يتم العثور على نموذج الدفع' : 'Payment form container not found');
      setInitPhase('error');
      return;
    }

    if (typeof window.Moyasar === 'undefined' || typeof window.Moyasar.init !== 'function') {
      console.error('Moyasar SDK not loaded');
      setMoyasarError(isArabic ? 'فشل تحميل نظام الدفع' : 'Payment system failed to load');
      setInitPhase('error');
      return;
    }

    moyasarInitStarted.current = true;
    setInitPhase('initializing');
    
    const amountInHalalas = Math.round(booking.total_amount * 100);
    const callbackUrl = `${PRODUCTION_DOMAIN}/payment-callback/${booking.id}`;

    console.log('Initializing Moyasar on standalone page:', { 
      amount: amountInHalalas, 
      bookingId: booking.id, 
      callbackUrl,
      hostname: currentHostname,
    });

    const getErrorMessage = (errorType?: string, errorCode?: string, errorMessage?: string): string => {
      const errorMessages: Record<string, { en: string; ar: string }> = {
        rejected: { en: 'Card was declined by your bank', ar: 'تم رفض البطاقة من قبل البنك' },
        insufficient_funds: { en: 'Insufficient funds', ar: 'رصيد غير كافٍ' },
        expired_card: { en: 'Card has expired', ar: 'البطاقة منتهية الصلاحية' },
        invalid_card: { en: 'Invalid card details', ar: 'تفاصيل البطاقة غير صحيحة' },
        processing_error: { en: 'Payment processing error. Please try again.', ar: 'خطأ في معالجة الدفع. يرجى المحاولة مرة أخرى.' },
        '3ds_failed': { en: '3D Secure verification failed', ar: 'فشل التحقق الأمني' },
        cancelled: { en: 'Payment was cancelled', ar: 'تم إلغاء الدفع' },
        timeout: { en: 'Payment timed out. Please try again.', ar: 'انتهت مهلة الدفع. يرجى المحاولة مرة أخرى.' },
        network_error: { en: 'Network error. Check your connection.', ar: 'خطأ في الشبكة. تحقق من اتصالك.' },
      };
      
      const key = errorCode || errorType || '';
      const mapped = errorMessages[key.toLowerCase()];
      if (mapped) return isArabic ? mapped.ar : mapped.en;
      
      return errorMessage || (isArabic ? 'حدث خطأ في عملية الدفع' : 'An error occurred during payment');
    };

    const logFailureToServer = async (error: any, errorType?: string) => {
      try {
        await supabase.functions.invoke('log-payment-failure', {
          body: {
            bookingId: booking.id,
            errorType: errorType || error?.type,
            errorCode: error?.code,
            errorMessage: error?.message,
            paymentId: error?.id,
            paymentMethod: error?.source?.type,
            amount: amountInHalalas / 100,
            metadata: {
              browser: navigator.userAgent,
              language: navigator.language,
              timestamp: new Date().toISOString(),
              page: 'standalone-payment',
              hostname: currentHostname,
            },
          },
        });
      } catch (logError) {
        console.error('Failed to log payment failure:', logError);
      }
    };

    const startSubmissionWatchdog = () => {
      if (submissionTimerRef.current) {
        clearTimeout(submissionTimerRef.current);
      }
      submissionTimerRef.current = setTimeout(async () => {
        console.warn('Submission watchdog triggered');
        setSubmissionStalled(true);
        await logFailureToServer({ type: 'client_timeout', message: 'Payment submission stalled' }, 'client_timeout');
      }, 25000);
    };

    const clearSubmissionWatchdog = () => {
      if (submissionTimerRef.current) {
        clearTimeout(submissionTimerRef.current);
        submissionTimerRef.current = null;
      }
    };

    try {
      window.Moyasar.init({
        element: '#moyasar-mount',
        amount: amountInHalalas,
        currency: 'SAR',
        description: `Souq Almufaijer Ticket - ${booking.booking_reference}`,
        publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
        callback_url: callbackUrl,
        methods: ['creditcard'],
        supported_networks: ['visa', 'mastercard', 'mada', 'amex'],
        language: isArabic ? 'ar' : 'en',
        fixed_width: true,
        on_initiating: () => {
          startSubmissionWatchdog();
        },
        on_completed: (payment: MoyasarPayment) => {
          clearSubmissionWatchdog();
          console.log('Payment completed:', payment.id, payment.status);
          
          if (payment.status === 'initiated' && payment.source?.transaction_url) {
            setTransactionUrl(payment.source.transaction_url);
            window.location.href = payment.source.transaction_url;
            return;
          }
          
          const redirectUrl = `${PRODUCTION_DOMAIN}/payment-callback/${booking.id}?id=${payment.id}&status=${payment.status}`;
          window.location.href = redirectUrl;
        },
        on_failure: async (error: any) => {
          clearSubmissionWatchdog();
          console.error('Payment failed:', error);
          await logFailureToServer(error);
          
          toast({
            title: isArabic ? 'فشل الدفع' : 'Payment Failed',
            description: getErrorMessage(error?.type, error?.code, error?.message),
            variant: 'destructive',
          });
        },
      });

      // Start polling for injection
      startInjectionPolling();

      // Also log mount status after delays for debugging
      setTimeout(() => {
        const mount = document.getElementById('moyasar-mount');
        console.log('Mount status after 500ms:', mount?.children.length, 'children');
      }, 500);

      setTimeout(() => {
        const mount = document.getElementById('moyasar-mount');
        console.log('Mount status after 2000ms:', mount?.children.length, 'children');
      }, 2000);

    } catch (err) {
      console.error('Failed to initialize Moyasar:', err);
      setMoyasarError(isArabic ? 'فشل في تهيئة نظام الدفع' : 'Failed to initialize payment system');
      setInitPhase('error');
    }
  }, [booking, isArabic, toast, isAllowedDomain, currentHostname, startInjectionPolling, updateDebugInfo]);

  // Initialize Moyasar when booking is loaded (and on allowed domain)
  useEffect(() => {
    if (booking && !moyasarInitStarted.current && isAllowedDomain) {
      const timer = setTimeout(initializeMoyasar, 100);
      return () => clearTimeout(timer);
    }
  }, [booking, initializeMoyasar, isAllowedDomain]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (submissionTimerRef.current) clearTimeout(submissionTimerRef.current);
      if (sdkLoadTimerRef.current) clearTimeout(sdkLoadTimerRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Debug mode: update info periodically
  useEffect(() => {
    if (isDebugMode) {
      const interval = setInterval(updateDebugInfo, 500);
      return () => clearInterval(interval);
    }
  }, [isDebugMode, updateDebugInfo]);

  const handleRetry = () => {
    moyasarInitStarted.current = false;
    setMoyasarError(null);
    setSubmissionStalled(false);
    setSdkLoadTimeout(false);
    setIsMoyasarReady(false);
    setInitPhase('idle');
    
    const container = document.getElementById('moyasar-mount');
    if (container) {
      container.innerHTML = '';
    }
    
    setTimeout(initializeMoyasar, 100);
  };

  const handleOpenProduction = () => {
    const productionUrl = `${PRODUCTION_DOMAIN}/pay/${bookingId}`;
    window.open(productionUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? 'جاري تحميل بيانات الحجز...' : 'Loading booking details...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {isArabic ? 'خطأ' : 'Error'}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to="/book">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isArabic ? 'العودة للحجز' : 'Back to Booking'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Domain block UI - shown when on non-production domain
  if (!isAllowedDomain) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${isArabic ? 'rtl' : 'ltr'}`} dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md bg-card rounded-lg border p-8">
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isArabic ? 'الدفع على الموقع الرسمي فقط' : 'Payment on Official Site Only'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isArabic 
              ? 'لأسباب أمنية، يمكن إتمام الدفع فقط على الموقع الرسمي. يرجى الضغط على الزر أدناه للمتابعة.'
              : 'For security reasons, payment can only be completed on the official website. Please click the button below to continue.'}
          </p>
          <Button onClick={handleOpenProduction} className="w-full mb-4">
            <ExternalLink className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {isArabic ? 'فتح الموقع الرسمي' : 'Open Official Site'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {PRODUCTION_DOMAIN}
          </p>
          
          {isDebugMode && (
            <div className="mt-4 p-3 bg-muted rounded text-left text-xs font-mono">
              <div>Current: {currentHostname}</div>
              <div>Allowed: {ALLOWED_DOMAINS.join(', ')}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isArabic ? 'rtl' : 'ltr'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Debug Panel */}
      {isDebugMode && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 text-green-400 p-3 rounded-lg text-xs font-mono max-w-xs">
          <div className="font-bold mb-2">Debug Panel</div>
          <div>Hostname: {currentHostname}</div>
          <div>Allowed: {isAllowedDomain ? '✅ Yes' : '❌ No'}</div>
          <div>SDK: {debugInfo.sdkLoaded ? '✅ Loaded' : '❌ Not loaded'}</div>
          <div>Mount: {debugInfo.mountExists ? '✅ Exists' : '❌ Missing'}</div>
          <div>Children: {debugInfo.mountChildCount}</div>
          <div>Phase: {initPhase}</div>
          <div>Ready: {isMoyasarReady ? '✅' : '❌'}</div>
          <div>Last: {debugInfo.lastCheck}</div>
        </div>
      )}

      {/* Simple Header */}
      <header className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            {isArabic ? 'دفع آمن' : 'Secure Payment'}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Booking Summary */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {isArabic ? 'ملخص الحجز' : 'Booking Summary'}
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isArabic ? 'رقم الحجز' : 'Reference'}</span>
              <span className="font-mono font-medium">{booking.booking_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isArabic ? 'الاسم' : 'Name'}</span>
              <span>{booking.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isArabic ? 'التاريخ' : 'Date'}</span>
              <span>{booking.visit_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isArabic ? 'التذاكر' : 'Tickets'}</span>
              <span>
                {booking.adult_count > 0 && `${booking.adult_count} ${isArabic ? 'بالغ' : 'Adult'}`}
                {booking.adult_count > 0 && booking.child_count > 0 && ' + '}
                {booking.child_count > 0 && `${booking.child_count} ${isArabic ? 'طفل' : 'Child'}`}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>{isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
              <span className="text-primary">{booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}</span>
            </div>
          </div>
        </div>

        {/* Payment Form Container */}
        <div className="bg-card rounded-lg border-2 border-primary/20 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">{isArabic ? 'بوابة الدفع الآمنة' : 'Secure Payment Gateway'}</h3>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'جميع المعاملات مشفرة وآمنة' : 'All transactions are encrypted and secure'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* Payment Form Container - relative wrapper for overlay approach */}
            <div className="relative min-h-[320px]">
              {/* Moyasar Mount Point - ALWAYS visible to SDK, never hidden */}
              <div 
                id="moyasar-mount" 
                className="min-h-[320px] moyasar-form"
                style={{ minHeight: '320px' }}
              />
              
              {/* Loading Overlay - positioned on top, removed when ready */}
              {!isMoyasarReady && !moyasarError && !submissionStalled && !sdkLoadTimeout && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-10 rounded-lg">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">
                    {isArabic ? 'جاري تحميل نموذج الدفع...' : 'Loading payment form...'}
                  </p>
                </div>
              )}
            </div>

            {/* SDK Load Timeout - Recovery UI */}
            {sdkLoadTimeout && !moyasarError && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {isArabic ? 'تعذر تحميل نموذج الدفع' : 'Payment form failed to load'}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 mb-4">
                      {isArabic 
                        ? 'قد يكون هذا بسبب اتصال الإنترنت أو إعدادات المتصفح. يرجى المحاولة مرة أخرى.'
                        : 'This may be due to your internet connection or browser settings. Please try again.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={handleRetry} variant="default" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                        {isArabic ? 'إعادة المحاولة' : 'Retry Payment'}
                      </Button>
                      <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline" 
                        size="sm"
                      >
                        {isArabic ? 'تحديث الصفحة' : 'Refresh Page'}
                      </Button>
                      <a 
                        href="https://wa.me/966500000000" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                          {isArabic ? 'تواصل معنا' : 'Contact Support'}
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {moyasarError && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">{moyasarError}</p>
                <Button onClick={handleRetry}>
                  {isArabic ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
              </div>
            )}

            {/* Stalled State */}
            {submissionStalled && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {isArabic ? 'يبدو أن الدفع معلق' : 'Payment appears to be stalled'}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {isArabic ? 'إذا لم تظهر صفحة البنك، يرجى المحاولة مرة أخرى.' : 'If the bank page did not appear, please try again.'}
                    </p>
                    {transactionUrl && (
                      <a
                        href={transactionUrl}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {isArabic ? 'فتح صفحة التحقق البنكي' : 'Open Bank Verification'}
                      </a>
                    )}
                    <Button onClick={handleRetry} variant="outline" size="sm" className="mt-3">
                      {isArabic ? 'إعادة المحاولة' : 'Retry Payment'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-4 w-4" />
            <span>PCI DSS</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link to="/book" className="text-sm text-muted-foreground hover:text-primary">
            {isArabic ? '← العودة لصفحة الحجز' : '← Back to booking page'}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;
