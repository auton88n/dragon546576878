import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';

type VerificationStatus = 'verifying' | 'success' | 'failed' | 'already_paid';

const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const { bookingId: pathBookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bookingReference, setBookingReference] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const verificationStarted = useRef(false);

  const paymentId = searchParams.get('id');
  const paymentStatus = searchParams.get('status');
  // Support both path param and query param for bookingId
  const bookingId = pathBookingId || searchParams.get('booking');
  const moyasarMessage = searchParams.get('message');

  useEffect(() => {
    // Prevent double verification
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const verifyPayment = async () => {
      // Check if we have the required params
      if (!paymentId || !bookingId) {
        setStatus('failed');
        setErrorMessage(isArabic 
          ? 'معلومات الدفع غير مكتملة'
          : 'Payment information is incomplete');
        return;
      }

      // Check if Moyasar already reports failure
      if (paymentStatus === 'failed') {
        setStatus('failed');
        setErrorMessage(moyasarMessage || (isArabic 
          ? 'فشل الدفع. يرجى المحاولة مرة أخرى.'
          : 'Payment failed. Please try again.'));
        return;
      }

      try {
        // Call our verification edge function
        const { data, error } = await supabase.functions.invoke('verify-moyasar-payment', {
          body: { paymentId, bookingId },
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('failed');
          setErrorMessage(isArabic
            ? 'حدث خطأ أثناء التحقق من الدفع'
            : 'An error occurred while verifying payment');
          return;
        }

        if (data?.success) {
          if (data.alreadyPaid) {
            setStatus('already_paid');
          } else {
            setStatus('success');
          }
          setBookingReference(data.bookingReference);
          
          // Redirect to confirmation after short delay
          setTimeout(() => {
            navigate(`/confirmation/${bookingId}`);
          }, 2000);
        } else {
          setStatus('failed');
          setErrorMessage(data?.error || (isArabic
            ? 'فشل التحقق من الدفع'
            : 'Payment verification failed'));
        }
      } catch (err) {
        console.error('Verification exception:', err);
        setStatus('failed');
        setErrorMessage(isArabic
          ? 'حدث خطأ غير متوقع'
          : 'An unexpected error occurred');
      }
    };

    verifyPayment();
  }, [paymentId, bookingId, paymentStatus, moyasarMessage, navigate, isArabic, retryCount]);

  const handleRetry = () => {
    verificationStarted.current = false;
    setStatus('verifying');
    setErrorMessage('');
    setRetryCount(prev => prev + 1);
  };

  const handleRetryPayment = () => {
    if (bookingId) {
      navigate(`/pay/${bookingId}`);
    }
  };

  const handleNewBooking = () => {
    navigate('/book');
  };

  const handleContactSupport = () => {
    navigate('/contact');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="glass-card-gold p-8 text-center space-y-6">
            
            {/* Verifying State */}
            {status === 'verifying' && (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-accent animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isArabic ? 'جاري التحقق من الدفع...' : 'Verifying Payment...'}
                </h1>
                <p className="text-muted-foreground">
                  {isArabic 
                    ? 'يرجى الانتظار بينما نتحقق من عملية الدفع'
                    : 'Please wait while we verify your payment'}
                </p>
              </>
            )}

            {/* Success State */}
            {(status === 'success' || status === 'already_paid') && (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
                </h1>
                {bookingReference && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {isArabic ? 'رقم الحجز' : 'Booking Reference'}
                    </p>
                    <p className="text-xl font-mono font-bold text-accent">{bookingReference}</p>
                  </div>
                )}
                <p className="text-muted-foreground">
                  {isArabic 
                    ? 'جاري توجيهك لصفحة التأكيد...'
                    : 'Redirecting to confirmation page...'}
                </p>
              </>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isArabic ? 'فشل الدفع' : 'Payment Failed'}
                </h1>
                
                {errorMessage && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300 text-start">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  {/* Primary: Retry payment on same booking */}
                  <Button
                    onClick={handleRetryPayment}
                    className="w-full btn-gold"
                  >
                    <CreditCard className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? 'إعادة محاولة الدفع' : 'Retry Payment'}
                  </Button>

                  {/* Secondary: Re-verify if payment might have gone through */}
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? 'إعادة التحقق' : 'Retry Verification'}
                  </Button>
                  
                  {/* Tertiary: Start fresh booking */}
                  <Button
                    onClick={handleNewBooking}
                    variant="ghost"
                    className="w-full text-muted-foreground"
                  >
                    {isArabic ? 'بدء حجز جديد' : 'Start New Booking'}
                  </Button>
                  
                  <Button
                    onClick={handleContactSupport}
                    variant="ghost"
                    className="w-full text-muted-foreground"
                  >
                    {isArabic ? 'تواصل مع الدعم' : 'Contact Support'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentCallbackPage;
