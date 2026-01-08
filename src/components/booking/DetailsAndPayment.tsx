import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Calendar, CheckCircle, CreditCard, FileText, Shield, Lock, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { loadMoyasarSdk, isMoyasarLoaded, getMoyasarDiagnostics } from '@/lib/loadMoyasarSdk';
import type { MoyasarPayment } from '@/types/moyasar.d';

interface DetailsAndPaymentProps {
  onPaymentComplete: (bookingId: string) => void;
  isProcessing: boolean;
}

const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Ah7AU1kvj5r64sAV369hkXhVuNi6bmAmVt1Pf1ZN';
const PRODUCTION_DOMAIN = 'https://almufaijer.com';

const createFormSchema = (isArabic: boolean) => z.object({
  name: z.string()
    .min(3, isArabic ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters')
    .max(100, isArabic ? 'الاسم طويل جداً' : 'Name is too long'),
  email: z.string()
    .email(isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')
    .max(255, isArabic ? 'البريد الإلكتروني طويل جداً' : 'Email is too long'),
  phone: z.string()
    .regex(/^\+966[0-9]{9}$/, isArabic ? 'رقم الهاتف يجب أن يكون بصيغة +966XXXXXXXXX' : 'Phone must be in format +966XXXXXXXXX'),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const DetailsAndPayment = ({ onPaymentComplete, isProcessing }: DetailsAndPaymentProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    customerInfo, 
    setCustomerInfo, 
    totalAmount: storedTotal,
    packageQuantities,
    tickets,
    pricing,
    visitDate,
  } = useBookingStore();

  // Recalculate total from packages if stored total is 0 (safety net for hydration issues)
  const totalAmount = storedTotal > 0 
    ? storedTotal 
    : packageQuantities.reduce((sum, pkg) => sum + pkg.price * pkg.quantity, 0);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [pendingBookingRef, setPendingBookingRef] = useState<string | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isMoyasarReady, setIsMoyasarReady] = useState(false);
  const [moyasarTimeout, setMoyasarTimeout] = useState(false);
  const [submissionStalled, setSubmissionStalled] = useState(false);
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);
  const [moyasarError, setMoyasarError] = useState<string | null>(null);
  // Debug states (avoid querying DOM during render)
  const [debugMountState, setDebugMountState] = useState<'unknown' | 'exists' | 'missing'>('unknown');
  const [debugInitPhase, setDebugInitPhase] = useState<'idle' | 'waiting_mount' | 'initializing' | 'initialized' | 'failed'>('idle');

  const moyasarInitStarted = useRef(false);
  const moyasarReadyRef = useRef(false); // Track readiness with ref to avoid stale closures
  const submissionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  // Debug mode - append ?debug=1 to URL to see diagnostics
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(isArabic)),
    defaultValues: {
      name: customerInfo.name || '',
      email: customerInfo.email || '',
      phone: customerInfo.phone || '+966',
    },
    mode: 'onChange',
  });

  const { formState: { errors, isValid } } = form;

  useEffect(() => {
    const subscription = form.watch((values) => {
      setCustomerInfo({
        name: values.name || '',
        email: values.email || '',
        phone: values.phone || '',
      });
    });
    return () => subscription.unsubscribe();
  }, [form, setCustomerInfo]);

  // Cleanup submission timer on unmount
  useEffect(() => {
    return () => {
      if (submissionTimerRef.current) {
        clearTimeout(submissionTimerRef.current);
      }
    };
  }, []);

  // Initialize Moyasar payment form
  const initializeMoyasar = useCallback(async (bookingId: string, bookingReference: string) => {
    // Clear any previous errors
    setMoyasarError(null);
    
    // Log comprehensive diagnostic info
    const diagnosticInfo = getMoyasarDiagnostics();
    console.log('Moyasar diagnostic info:', { ...diagnosticInfo, bookingId });

    // Check if already initialized
    if (moyasarInitStarted.current) {
      console.warn('Moyasar already initialized, skipping');
      return;
    }

    // Ensure SDK is loaded (use loader utility with fallback)
    try {
      const loadResult = await loadMoyasarSdk();
      console.log('Moyasar SDK load result:', loadResult);
    } catch (sdkError) {
      const errorMsg = sdkError instanceof Error ? sdkError.message : 'Failed to load payment SDK';
      console.error('Moyasar SDK load failed:', errorMsg, getMoyasarDiagnostics());
      setMoyasarError(isArabic ? 'فشل تحميل نظام الدفع. يرجى تحديث الصفحة.' : errorMsg);
      return;
    }

    // Double-check SDK is available
    if (!isMoyasarLoaded()) {
      const errorMsg = 'Moyasar SDK loaded but init() not available. SDK may be corrupted.';
      console.error(errorMsg, getMoyasarDiagnostics());
      setMoyasarError(errorMsg);
      return;
    }

    // Check if mount container exists
    const container = document.getElementById('moyasar-mount');
    if (!container) {
      const errorMsg = 'Payment form container not found in DOM.';
      console.error(errorMsg);
      setMoyasarError(errorMsg);
      return;
    }

    moyasarInitStarted.current = true;
    const amountInHalalas = Math.round(totalAmount * 100);
    const callbackUrl = `${PRODUCTION_DOMAIN}/payment-callback/${bookingId}`;

    console.log('Initializing Moyasar with:', { 
      amount: amountInHalalas, 
      bookingId, 
      callbackUrl 
    });

    // Error code to user-friendly message mapping
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

    // Log payment failure to server
    const logFailureToServer = async (error: any, errorType?: string) => {
      try {
        await supabase.functions.invoke('log-payment-failure', {
          body: {
            bookingId,
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
            },
          },
        });
      } catch (logError) {
        console.error('Failed to log payment failure:', logError);
      }
    };

    // Start submission watchdog when user submits
    const startSubmissionWatchdog = () => {
      if (submissionTimerRef.current) {
        clearTimeout(submissionTimerRef.current);
      }
      console.log('Starting 25s submission watchdog');
      submissionTimerRef.current = setTimeout(async () => {
        console.warn('Submission watchdog triggered - payment stalled');
        setSubmissionStalled(true);
        await logFailureToServer({ type: 'client_timeout', message: 'Payment submission stalled' }, 'client_timeout');
      }, 25000);
    };

    // Clear watchdog on success/failure
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
        description: `Souq Almufaijer Ticket - ${bookingReference}`,
        publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
        callback_url: callbackUrl,
        methods: ['creditcard'],
        supported_networks: ['visa', 'mastercard', 'mada', 'amex'],
        language: isArabic ? 'ar' : 'en',
        fixed_width: true,
        on_initiating: () => {
          console.log('Payment form initiating for booking:', bookingId);
          startSubmissionWatchdog();
        },
        on_completed: (payment: MoyasarPayment) => {
          clearSubmissionWatchdog();
          console.log('on_completed fired:', payment.id, payment.status, payment.source?.transaction_url);
          
          // Handle 3D Secure / bank verification
          if (payment.status === 'initiated' && payment.source?.transaction_url) {
            console.log('3DS required, redirecting to:', payment.source.transaction_url);
            setTransactionUrl(payment.source.transaction_url);
            // Navigate to 3DS page
            window.location.href = payment.source.transaction_url;
            return;
          }
          
          // Payment completed (paid status) - redirect to callback
          console.log('Payment completed, forcing redirect');
          const redirectUrl = `${PRODUCTION_DOMAIN}/payment-callback/${bookingId}?id=${payment.id}&status=${payment.status}`;
          window.location.href = redirectUrl;
        },
        on_failure: async (error: any) => {
          clearSubmissionWatchdog();
          console.error('Payment failed:', {
            type: error?.type,
            message: error?.message,
            code: error?.code,
            full_error: JSON.stringify(error, null, 2)
          });
          
          // Log to server for analytics
          await logFailureToServer(error);
          
          // Show user-friendly error message
          const userMessage = getErrorMessage(error?.type, error?.code, error?.message);
          toast({
            title: isArabic ? 'فشل الدفع' : 'Payment Failed',
            description: userMessage,
            variant: 'destructive',
          });
        },
      });

      console.log('Moyasar.init() called successfully, setting up MutationObserver');

      // Use MutationObserver to reliably detect form injection
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new MutationObserver((mutations) => {
        const formEl = paymentFormRef.current;
        if (formEl && formEl.querySelector('form, iframe, input')) {
          console.log('MutationObserver: Moyasar form elements detected');
          moyasarReadyRef.current = true;
          setIsMoyasarReady(true);
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
        console.log('Moyasar form elements already present');
        moyasarReadyRef.current = true;
        setIsMoyasarReady(true);
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
  }, [totalAmount, isArabic, toast]);

  // Wait for DOM element to exist with polling (use setTimeout, not DOM queries during render)
  const waitForElement = useCallback((selector: string, maxAttempts = 40, interval = 50): Promise<HTMLElement | null> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts += 1;
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (attempts >= maxAttempts) {
          resolve(null);
          return;
        }
        setTimeout(check, interval);
      };
      // small delay to allow React commit
      setTimeout(check, interval);
    });
  }, []);

  // Initialize Moyasar when payment form is shown
  useEffect(() => {
    if (showPaymentForm && pendingBookingId && pendingBookingRef && !moyasarInitStarted.current) {
      // Reset states
      setIsMoyasarReady(false);
      moyasarReadyRef.current = false;
      setMoyasarTimeout(false);
      setMoyasarError(null);
      setDebugMountState('unknown');
      setDebugInitPhase('waiting_mount');

      const initPayment = async () => {
        const container = await waitForElement('#moyasar-mount');
        if (!container) {
          setDebugMountState('missing');
          setDebugInitPhase('failed');
          setMoyasarError('Payment form container failed to render. Please refresh.');
          return;
        }

        setDebugMountState('exists');
        setDebugInitPhase('initializing');
        initializeMoyasar(pendingBookingId, pendingBookingRef);
        setDebugInitPhase('initialized');
      };

      initPayment();

      // Set timeout fallback - use ref to get current value
      const timeoutId = setTimeout(() => {
        if (!moyasarReadyRef.current) {
          console.warn('Moyasar 12s timeout triggered - form did not load');
          setMoyasarTimeout(true);
        }
      }, 12000); // 12 second timeout

      return () => {
        clearTimeout(timeoutId);
        observerRef.current?.disconnect();
      };
    }
  }, [showPaymentForm, pendingBookingId, pendingBookingRef, initializeMoyasar, waitForElement]);

  // Retry handler with proper DOM wait
  const handleRetryMoyasar = async () => {
    moyasarInitStarted.current = false;
    moyasarReadyRef.current = false;
    setMoyasarTimeout(false);
    setIsMoyasarReady(false);
    setMoyasarError(null);
    setSubmissionStalled(false);
    setDebugMountState('unknown');
    setDebugInitPhase('waiting_mount');
    observerRef.current?.disconnect();

    // Clear the form container
    if (paymentFormRef.current) {
      paymentFormRef.current.innerHTML = '';
    }

    if (pendingBookingId && pendingBookingRef) {
      const container = await waitForElement('#moyasar-mount');
      if (!container) {
        setDebugMountState('missing');
        setDebugInitPhase('failed');
        setMoyasarError('Payment form container not found. Please refresh the page.');
        return;
      }

      setDebugMountState('exists');
      setDebugInitPhase('initializing');
      initializeMoyasar(pendingBookingId, pendingBookingRef);
      setDebugInitPhase('initialized');
    }
  };

  // Create booking and show payment form
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !termsAccepted || isCreatingBooking) return;

    setIsCreatingBooking(true);

    try {
      // Create booking first (with pending payment status)
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          specialRequests: customerInfo.specialRequests || null,
          visitDate: visitDate!,
          visitTime: '15:00',
          adultCount: tickets.adult,
          childCount: tickets.child,
          adultPrice: pricing.adult,
          childPrice: pricing.child,
          totalAmount: totalAmount,
          language: currentLanguage,
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to create booking');
      }

      console.log('Booking created, redirecting to payment page:', data.bookingId);
      // Redirect to standalone payment page with booking data to avoid RLS issues
      navigate(`/pay/${data.bookingId}`, {
        state: {
          booking: {
            id: data.bookingId,
            booking_reference: data.bookingReference,
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            total_amount: totalAmount,
            visit_date: visitDate,
            visit_time: '15:00',
            adult_count: tickets.adult,
            child_count: tickets.child,
          }
        }
      });

    } catch (error) {
      console.error('Booking creation error:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic 
          ? 'حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while creating your booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const canSubmit = isValid && termsAccepted && !isCreatingBooking && !showPaymentForm;

  return (
    <div className="space-y-8">
      {/* Contact Information */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">1</span>
          {isArabic ? 'معلومات الاتصال' : 'Contact Information'}
        </h3>

        <Form {...form}>
          <div className="grid gap-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {isArabic ? 'الاسم الكامل' : 'Full Name'} *
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <User className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <Input
                        {...field}
                        placeholder={isArabic ? 'أدخل اسمك' : 'Enter your name'}
                        className="pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-xl border-2 focus:border-accent transition-all"
                        disabled={showPaymentForm}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {isArabic ? 'البريد الإلكتروني' : 'Email'} *
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@email.com"
                        className="pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-xl border-2 focus:border-accent transition-all"
                        dir="ltr"
                        disabled={showPaymentForm}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {isArabic ? 'رقم الجوال' : 'Phone'} *
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+966501234567"
                        className="pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-xl border-2 focus:border-accent font-mono transition-all"
                        dir="ltr"
                        disabled={showPaymentForm}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </div>

      {/* Payment Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">2</span>
          {isArabic ? 'الدفع' : 'Payment'}
        </h3>

        {!showPaymentForm ? (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            {/* Terms Acceptance */}
            <div className="p-4 bg-muted/50 border border-border rounded-xl">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  <FileText className="inline h-4 w-4 text-accent mr-1 rtl:ml-1 rtl:mr-0" />
                  {isArabic ? (
                    <>
                      لقد قرأت وأوافق على{' '}
                      <Link to="/terms" target="_blank" className="text-accent hover:underline font-medium">
                        سياسة الاستبدال والشروط
                      </Link>
                      {' '}(لا يوجد استرداد، استبدال التاريخ قبل 3 أيام فقط)
                    </>
                  ) : (
                    <>
                      I have read and agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-accent hover:underline font-medium">
                        Exchange Policy & Terms
                      </Link>
                      {' '}(No refunds, date exchange 3 days before only)
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Amount Display */}
            <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">
                  {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-accent">
                  {totalAmount} <span className="text-base">{isArabic ? 'ر.س' : 'SAR'}</span>
                </span>
              </div>
            </div>

            {/* Proceed to Payment Button */}
            <Button
              type="submit"
              size="lg"
              className={cn(
                'w-full h-14 text-lg rounded-xl transition-all duration-300',
                canSubmit 
                  ? 'btn-gold' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
              disabled={!canSubmit}
            >
              {isCreatingBooking ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  {isArabic ? 'جاري التحضير...' : 'Preparing...'}
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  {isArabic ? 'المتابعة للدفع' : 'Proceed to Payment'}
                </span>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Submission Stalled UI */}
            {submissionStalled && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      {isArabic ? 'يستغرق الدفع وقتاً أطول من المتوقع' : 'Payment is taking longer than expected'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {transactionUrl && (
                        <Button
                          size="sm"
                          onClick={() => window.location.href = transactionUrl}
                          className="btn-gold gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {isArabic ? 'متابعة التحقق البنكي' : 'Continue Bank Verification'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetryMoyasar}
                      >
                        {isArabic ? 'إعادة المحاولة' : 'Retry Payment'}
                      </Button>
                      {pendingBookingId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <Link to={`/pay/${pendingBookingId}`}>
                            {isArabic ? 'صفحة دفع منفصلة' : 'Separate Payment Page'}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Panel */}
            {isDebugMode && (
              <div className="mb-4 p-4 bg-muted border border-border rounded-xl font-mono text-xs space-y-1">
                <p className="font-bold text-foreground mb-2">🔧 Moyasar Debug Panel</p>
                <p>
                  SDK Loaded:{' '}
                  <span className={typeof window.Moyasar !== 'undefined' ? 'text-green-600' : 'text-red-600'}>
                    {typeof window.Moyasar !== 'undefined' ? 'Yes' : 'No'}
                  </span>
                </p>
                <p>
                  SDK init():{' '}
                  <span className={typeof window.Moyasar?.init === 'function' ? 'text-green-600' : 'text-red-600'}>
                    {typeof window.Moyasar?.init === 'function' ? 'Available' : 'Missing'}
                  </span>
                </p>
                <p>Publishable Key: ...{MOYASAR_PUBLISHABLE_KEY.slice(-8)}</p>
                <p>Domain: {window.location.hostname}</p>
                <p>
                  Mount Container:{' '}
                  <span className={debugMountState === 'exists' ? 'text-green-600' : debugMountState === 'missing' ? 'text-red-600' : 'text-amber-600'}>
                    {debugMountState === 'exists' ? 'Exists' : debugMountState === 'missing' ? 'Missing' : 'Checking...'}
                  </span>
                </p>
                <p>
                  Init Phase:{' '}
                  <span className={debugInitPhase === 'initialized' ? 'text-green-600' : debugInitPhase === 'failed' ? 'text-red-600' : 'text-amber-600'}>
                    {debugInitPhase}
                  </span>
                </p>
                <p>
                  Form Ready:{' '}
                  <span className={isMoyasarReady ? 'text-green-600' : 'text-amber-600'}>
                    {isMoyasarReady ? 'Yes' : 'Loading...'}
                  </span>
                </p>
                <p>Init Started (ref): {moyasarInitStarted.current ? 'Yes' : 'No'}</p>
                {moyasarError && <p className="text-red-600">Error: {moyasarError}</p>}
                {pendingBookingId && <p>Booking ID: {pendingBookingId.slice(0, 8)}...</p>}
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
                    {pendingBookingRef && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {isArabic ? 'رقم الحجز:' : 'Booking Ref:'} <span className="font-mono font-bold">{pendingBookingRef}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Form Container - always visible for Safari compatibility */}
            <div className="relative rounded-2xl overflow-hidden bg-card border-2 border-border shadow-lg">
              {/* Loading overlay - shown on top while loading */}
              {!isMoyasarReady && !moyasarError && (
                <div className="absolute inset-0 z-10 bg-card p-6 md:p-8">
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
                      {pendingBookingRef && (
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'رقم الحجز:' : 'Booking Ref:'} <span className="font-mono font-bold">{pendingBookingRef}</span>
                        </p>
                      )}
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
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-14 bg-muted rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-12 bg-muted rounded" />
                          <div className="h-14 bg-muted rounded-xl" />
                        </div>
                      </div>
                      <div className="h-16 bg-muted rounded-xl mt-4" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Moyasar Mount - always rendered, never hidden */}
              <div 
                id="moyasar-mount"
                ref={paymentFormRef}
                className="moyasar-form p-6 md:p-8"
                style={{ minHeight: '320px' }}
              />
            </div>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>{isArabic ? 'دفع آمن عبر Moyasar' : 'Secure payment via Moyasar'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-8 pt-4">
        <div className="flex items-center gap-2 text-muted-foreground group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <Calendar className="h-4 w-4 text-accent" />
          </div>
          <span className="text-xs font-medium">{isArabic ? 'حجز فوري' : 'Instant'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <span className="text-xs font-medium">{isArabic ? 'دفع آمن' : 'Secure'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <CheckCircle className="h-4 w-4 text-accent" />
          </div>
          <span className="text-xs font-medium">{isArabic ? 'تأكيد فوري' : 'Confirmed'}</span>
        </div>
      </div>
    </div>
  );
};

export default DetailsAndPayment;
