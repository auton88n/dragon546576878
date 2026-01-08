import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Calendar, CheckCircle, CreditCard, FileText, Shield, Lock, Loader2 } from 'lucide-react';
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
import type { MoyasarPayment } from '@/types/moyasar.d';

interface DetailsAndPaymentProps {
  onPaymentComplete: (bookingId: string) => void;
  isProcessing: boolean;
}

const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Z4WZcnyWGhaDva7QgnBdb53DWzokQmiCATjFmST2';

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
  const moyasarInitStarted = useRef(false);
  const paymentFormRef = useRef<HTMLDivElement>(null);

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

  // Initialize Moyasar payment form
  const initializeMoyasar = useCallback((bookingId: string, bookingReference: string) => {
    if (moyasarInitStarted.current || !window.Moyasar) {
      console.error('Moyasar SDK not loaded or already initialized');
      return;
    }

    moyasarInitStarted.current = true;
    const amountInHalalas = Math.round(totalAmount * 100);
    const PRODUCTION_DOMAIN = 'https://almufaijer.com';
    const callbackUrl = `${PRODUCTION_DOMAIN}/payment-callback?booking=${bookingId}`;

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
    const logFailureToServer = async (error: any) => {
      try {
        await supabase.functions.invoke('log-payment-failure', {
          body: {
            bookingId,
            errorType: error?.type,
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
        },
        on_completed: (payment: MoyasarPayment) => {
          console.log('Payment completed, forcing redirect:', payment.id, payment.status);
          // Force redirect - don't rely on gateway auto-redirect
          const redirectUrl = `${PRODUCTION_DOMAIN}/payment-callback?booking=${bookingId}&id=${payment.id}&status=${payment.status}`;
          window.location.href = redirectUrl;
        },
        on_failure: async (error: any) => {
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

      // Poll for form injection to detect when Moyasar is ready
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        const formEl = paymentFormRef.current;
        if (formEl && formEl.querySelector('form, iframe, input')) {
          clearInterval(pollInterval);
          setIsMoyasarReady(true);
          console.log('Moyasar form ready');
        } else if (pollCount > 50) { // 5 seconds max
          clearInterval(pollInterval);
          setIsMoyasarReady(true); // Show anyway to avoid infinite skeleton
          console.warn('Moyasar polling timeout, showing form anyway');
        }
      }, 100);
    } catch (error) {
      console.error('Failed to initialize Moyasar:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تهيئة نظام الدفع' : 'Failed to initialize payment system',
        variant: 'destructive',
      });
    }
  }, [totalAmount, isArabic, toast]);

  // Initialize Moyasar when payment form is shown
  useEffect(() => {
    if (showPaymentForm && pendingBookingId && pendingBookingRef && !moyasarInitStarted.current) {
      // Reset states
      setIsMoyasarReady(false);
      setMoyasarTimeout(false);
      
      // Initialize after DOM render
      requestAnimationFrame(() => {
        initializeMoyasar(pendingBookingId, pendingBookingRef);
      });

      // Set timeout fallback
      const timeoutId = setTimeout(() => {
        if (!isMoyasarReady) {
          setMoyasarTimeout(true);
        }
      }, 12000); // 12 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [showPaymentForm, pendingBookingId, pendingBookingRef, initializeMoyasar, isMoyasarReady]);

  // Retry handler
  const handleRetryMoyasar = () => {
    moyasarInitStarted.current = false;
    setMoyasarTimeout(false);
    setIsMoyasarReady(false);
    // Clear the form container
    if (paymentFormRef.current) {
      paymentFormRef.current.innerHTML = '';
    }
    if (pendingBookingId && pendingBookingRef) {
      initializeMoyasar(pendingBookingId, pendingBookingRef);
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

      console.log('Booking created:', data.bookingId);
      setPendingBookingId(data.bookingId);
      setPendingBookingRef(data.bookingReference);
      setShowPaymentForm(true);

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
            {/* Payment Form Container - always visible for Safari compatibility */}
            <div className="relative rounded-2xl overflow-hidden bg-card border-2 border-border shadow-lg">
              {/* Loading overlay - shown on top while loading */}
              {!isMoyasarReady && (
                <div className="absolute inset-0 z-10 bg-card p-6 md:p-8">
                  {moyasarTimeout ? (
                    <div className="text-center space-y-4 h-full flex flex-col items-center justify-center">
                      <p className="text-muted-foreground">
                        {isArabic ? 'تأخر تحميل نموذج الدفع. يرجى المحاولة مرة أخرى.' : 'Payment form is taking longer than expected.'}
                      </p>
                      <Button onClick={handleRetryMoyasar} variant="outline" className="gap-2">
                        <Loader2 className="h-4 w-4" />
                        {isArabic ? 'إعادة المحاولة' : 'Retry'}
                      </Button>
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
