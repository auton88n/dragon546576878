import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, CreditCard, Shield, Lock, ExternalLink, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadMoyasarSdk, isMoyasarLoaded, getMoyasarDiagnostics } from '@/lib/loadMoyasarSdk';
import { 
  buildMoyasarConfig, 
  isAllowedPaymentDomain, 
  getPaymentErrorMessage, 
  handlePaymentCompletion,
  ALLOWED_DOMAINS 
} from '@/lib/moyasarConfig';
import type { MoyasarPayment } from '@/types/moyasar.d';

const SDK_LOAD_TIMEOUT_MS = 12000;
const PRODUCTION_URL = 'https://almufaijer.com';

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
  const isAllowedDomain = isAllowedPaymentDomain();

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

  const updateDebugInfo = useCallback(() => {
    const mount = document.getElementById('moyasar-mount');
    setDebugInfo({
      sdkLoaded: typeof window.Moyasar !== 'undefined',
      mountExists: !!mount,
      mountChildCount: mount?.children.length || 0,
      lastCheck: new Date().toLocaleTimeString(),
    });
  }, []);

  useEffect(() => {
    // If we have navigation state, use it.
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

    // Otherwise fetch minimal booking details from an Edge Function.
    const run = async () => {
      if (!bookingId) {
        setError(isArabic ? 'معرف الحجز غير صالح' : 'Invalid booking ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-booking-for-payment', {
        body: { bookingId },
      });

      if (error || !data?.success) {
        const message = data?.error || error?.message || 'Failed to load booking details';
        setError(isArabic ? 'تعذر تحميل بيانات الحجز. يرجى إعادة الحجز.' : message);
        setLoading(false);
        return;
      }

      setBooking(data.booking as BookingDetails);
      setLoading(false);
    };

    void run();
  }, [bookingId, bookingFromState, isArabic]);

  const checkMountHasElements = useCallback(() => {
    const mount = document.getElementById('moyasar-mount');
    if (!mount) return false;
    // Check for actual form elements OR if mount has "Form configuration issue" text (error)
    const hasFormElements = !!(mount.querySelector('form, iframe, input') || mount.children.length > 0);
    // Detect if Moyasar rendered an error message
    if (hasFormElements && mount.textContent?.includes('Form configuration issue')) {
      return false; // Not ready - it's an error state
    }
    return hasFormElements;
  }, []);

  const startInjectionPolling = useCallback(() => {
    setInitPhase('waiting_injection');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      const mount = document.getElementById('moyasar-mount');
      
      // Check for Moyasar "Form configuration issue" error
      if (mount?.textContent?.includes('Form configuration issue')) {
        console.error('Moyasar returned "Form configuration issue"');
        setMoyasarError(isArabic 
          ? 'خطأ في إعدادات نموذج الدفع. يرجى التواصل مع الدعم.'
          : 'Payment form configuration error. Please contact support.');
        setInitPhase('error');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
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
  }, [checkMountHasElements, isMoyasarReady, updateDebugInfo, isArabic]);

  const initializeMoyasar = useCallback(async () => {
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

    try {
      const loadResult = await loadMoyasarSdk();
      console.log('Moyasar SDK load result:', loadResult);
    } catch (sdkError) {
      const errorMsg = sdkError instanceof Error ? sdkError.message : 'Failed to load payment SDK';
      console.error('Moyasar SDK load failed:', errorMsg, getMoyasarDiagnostics());
      setMoyasarError(isArabic ? 'فشل تحميل نظام الدفع. يرجى تحديث الصفحة.' : errorMsg);
      setInitPhase('error');
      return;
    }

    if (!isMoyasarLoaded()) {
      console.error('Moyasar SDK not loaded after loader');
      setMoyasarError(isArabic ? 'فشل تحميل نظام الدفع' : 'Payment system failed to load');
      setInitPhase('error');
      return;
    }

    moyasarInitStarted.current = true;
    setInitPhase('initializing');
    
    const amountInHalalas = Math.round(booking.total_amount * 100);

    console.log('Initializing Moyasar with MINIMAL config:', { 
      amount: amountInHalalas, 
      bookingId: booking.id, 
      hostname: currentHostname,
    });

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

    // Watchdog functions - triggered by DOM events, not on_initiating
    const startSubmissionWatchdog = () => {
      if (submissionTimerRef.current) {
        clearTimeout(submissionTimerRef.current);
      }
      console.log('Starting 25s submission watchdog');
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
      // Config matching official Moyasar docs exactly - use class selector
      const config = buildMoyasarConfig({
        mountSelector: '.mysr-form',
        amountInHalalas,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        onCompleted: async (payment: MoyasarPayment) => {
          clearSubmissionWatchdog();
          handlePaymentCompletion(payment, booking.id, setTransactionUrl);
        },
      });

      console.log('Moyasar MINIMAL config:', { ...config, publishable_api_key: '***' });
      window.Moyasar.init(config as any);

      // DOM-based watchdog: listen for form submission events
      setTimeout(() => {
        const mount = document.getElementById('moyasar-mount');
        if (mount) {
          // Capture form submit
          mount.addEventListener('submit', () => {
            console.log('Form submit detected - starting watchdog');
            startSubmissionWatchdog();
          }, true);
          
          // Capture button clicks as fallback
          mount.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON' || target.closest('button')) {
              console.log('Button click detected - starting watchdog');
              startSubmissionWatchdog();
            }
          }, true);
        }
      }, 500);

      startInjectionPolling();

    } catch (err) {
      console.error('Failed to initialize Moyasar:', err);
      setMoyasarError(isArabic ? 'فشل في تهيئة نظام الدفع' : 'Failed to initialize payment system');
      setInitPhase('error');
    }
  }, [booking, isArabic, isAllowedDomain, currentHostname, startInjectionPolling, updateDebugInfo]);

  useEffect(() => {
    if (booking && !moyasarInitStarted.current && isAllowedDomain) {
      const timer = setTimeout(initializeMoyasar, 100);
      return () => clearTimeout(timer);
    }
  }, [booking, initializeMoyasar, isAllowedDomain]);

  useEffect(() => {
    return () => {
      if (submissionTimerRef.current) clearTimeout(submissionTimerRef.current);
      if (sdkLoadTimerRef.current) clearTimeout(sdkLoadTimerRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

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
    const productionUrl = `${PRODUCTION_URL}/pay/${bookingId}`;
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
            {PRODUCTION_URL}
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
          <div className="font-bold mb-2">🔧 Payment Debug</div>
          <div>Phase: {initPhase}</div>
          <div>SDK: {debugInfo.sdkLoaded ? '✅' : '❌'}</div>
          <div>Mount: {debugInfo.mountExists ? '✅' : '❌'}</div>
          <div>Children: {debugInfo.mountChildCount}</div>
          <div>Ready: {isMoyasarReady ? '✅' : '❌'}</div>
          <div>Time: {debugInfo.lastCheck}</div>
        </div>
      )}

      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isArabic ? 'إتمام الدفع' : 'Complete Payment'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? `المبلغ: ${booking.total_amount} ر.س` : `Amount: ${booking.total_amount} SAR`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isArabic ? `رقم الحجز: ${booking.booking_reference}` : `Ref: ${booking.booking_reference}`}
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{isArabic ? 'دفع آمن ومشفر' : 'Secure & Encrypted'}</span>
        </div>

        {/* Payment Form Container */}
        <div className="bg-card rounded-xl border-2 border-primary/20 shadow-lg p-6 relative min-h-[400px]">
          {/* Loading Overlay */}
          {!isMoyasarReady && !moyasarError && !sdkLoadTimeout && !submissionStalled && (
            <div className="absolute inset-0 bg-card/95 flex flex-col items-center justify-center z-10 rounded-xl">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">
                {isArabic ? 'جاري تحميل نموذج الدفع...' : 'Loading payment form...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {moyasarError && (
            <div className="absolute inset-0 bg-card flex flex-col items-center justify-center z-10 rounded-xl p-6">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-center text-destructive mb-4">{moyasarError}</p>
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isArabic ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </div>
          )}

          {/* Timeout State */}
          {sdkLoadTimeout && !moyasarError && (
            <div className="absolute inset-0 bg-card flex flex-col items-center justify-center z-10 rounded-xl p-6">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                {isArabic 
                  ? 'تأخر تحميل نموذج الدفع. يرجى المحاولة مرة أخرى.'
                  : 'Payment form took too long to load. Please try again.'}
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  {isArabic ? 'تحديث الصفحة' : 'Refresh Page'}
                </Button>
              </div>
            </div>
          )}

          {/* Stalled State - Simple processing UI */}
          {submissionStalled && (
            <div className="absolute inset-0 bg-card flex flex-col items-center justify-center z-10 rounded-xl p-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              
              <p className="text-lg font-medium text-foreground mb-2 text-center">
                {isArabic ? 'جاري معالجة الدفع...' : 'Processing your payment...'}
              </p>
              
              <p className="text-center text-muted-foreground mb-6">
                {isArabic ? 'قد يستغرق هذا لحظة.' : 'This may take a moment.'}
              </p>
              
              {transactionUrl && (
                <Button onClick={() => window.location.href = transactionUrl} className="w-full max-w-xs">
                  {isArabic ? 'متابعة التحقق البنكي' : 'Continue Bank Verification'}
                </Button>
              )}
            </div>
          )}

          {/* Moyasar Mount Point - Always visible for SDK injection */}
          <div 
            id="moyasar-mount" 
            className="mysr-form min-h-[320px]"
          />
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            to="/book" 
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {isArabic ? 'العودة للحجز' : 'Back to Booking'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
