import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InvoiceCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams.get('id');
      const paymentStatus = searchParams.get('status');
      const invoiceId = searchParams.get('invoiceId');

      if (!paymentId || !invoiceId) {
        setError(isArabic ? 'معلومات الدفع غير مكتملة' : 'Incomplete payment information');
        setStatus('error');
        return;
      }

      if (paymentStatus !== 'paid') {
        setError(isArabic ? 'لم يتم إكمال الدفع' : 'Payment was not completed');
        setStatus('error');
        return;
      }

      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-invoice-payment', {
          body: { paymentId, invoiceId },
        });

        if (verifyError) throw verifyError;

        if (data?.success) {
          setStatus('success');
          // Redirect to success page after a short delay
          setTimeout(() => {
            navigate(`/invoice-success?invoiceId=${invoiceId}`);
          }, 2000);
        } else {
          throw new Error(data?.error || 'Verification failed');
        }
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.message || (isArabic ? 'فشل التحقق من الدفع' : 'Payment verification failed'));
        setStatus('error');
      }
    };

    verifyPayment();
  }, [searchParams, isArabic, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container max-w-lg mx-auto px-4 flex-1 flex items-center justify-center py-8">
        <Card className="text-center py-12 w-full">
          <CardContent>
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <h1 className="text-xl font-bold mb-2">
                  {isArabic ? 'جاري التحقق من الدفع...' : 'Verifying Payment...'}
                </h1>
                <p className="text-muted-foreground">
                  {isArabic ? 'يرجى الانتظار' : 'Please wait'}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h1 className="text-xl font-bold mb-2">
                  {isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
                </h1>
                <p className="text-muted-foreground">
                  {isArabic ? 'جاري تحويلك...' : 'Redirecting...'}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <h1 className="text-xl font-bold mb-2">
                  {isArabic ? 'فشل الدفع' : 'Payment Failed'}
                </h1>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.history.back()}>
                  {isArabic ? 'المحاولة مرة أخرى' : 'Try Again'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
