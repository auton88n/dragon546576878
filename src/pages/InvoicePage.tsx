import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { loadMoyasarSdk } from '@/lib/loadMoyasarSdk';
import { isAllowedPaymentDomain, MOYASAR_PUBLISHABLE_KEY } from '@/lib/moyasarConfig';

interface CustomInvoice {
  id: string;
  invoice_number: string;
  client_type: 'company' | 'individual';
  company_name: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  total_amount: number;
  num_adults: number;
  num_children: number;
  services: string[];
  visit_date: string;
  visit_time: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  expires_at: string;
}

const SERVICES_MAP: Record<string, { en: string; ar: string }> = {
  private_tour: { en: 'Private Heritage Tour', ar: 'جولة تراثية خاصة' },
  refreshments: { en: 'Traditional Refreshments', ar: 'ضيافة تقليدية' },
  photography: { en: 'Professional Photography', ar: 'تصوير احترافي' },
  vip_seating: { en: 'VIP Seating', ar: 'مقاعد VIP' },
  coordinator: { en: 'Dedicated Coordinator', ar: 'منسق مخصص' },
  custom_itinerary: { en: 'Custom Itinerary', ar: 'برنامج مخصص' },
  transportation: { en: 'Transportation Arrangement', ar: 'ترتيب النقل' },
  catering: { en: 'Full Catering Service', ar: 'خدمة طعام كاملة' },
};

export default function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [moyasarReady, setMoyasarReady] = useState(false);

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data as CustomInvoice;
    },
    enabled: !!invoiceId,
  });

  // Check if invoice is expired
  const isExpired = invoice && new Date(invoice.expires_at) < new Date();

  // Initialize Moyasar when ready
  useEffect(() => {
    if (!invoice || invoice.status !== 'pending' || isExpired) return;
    if (!isAllowedPaymentDomain()) return;

    const initPayment = async () => {
      setIsPaymentLoading(true);
      try {
        const result = await loadMoyasarSdk();
        if (!result.success) {
          setPaymentError(isArabic ? 'فشل تحميل نظام الدفع' : 'Failed to load payment system');
          return;
        }

        if (!window.Moyasar || !paymentFormRef.current) return;

        const callbackUrl = `${window.location.origin}/invoice-callback?invoiceId=${invoice.id}`;
        
        window.Moyasar.init({
          element: '.mysr-form',
          amount: Math.round(invoice.total_amount * 100), // Convert to halalas
          currency: 'SAR',
          description: `Invoice ${invoice.invoice_number}`,
          publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
          callback_url: callbackUrl,
          methods: ['creditcard', 'applepay', 'stcpay'],
          apple_pay: {
            country: 'SA',
            label: 'Souq Almufaijer',
            validate_merchant_url: 'https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/apple-pay-domain-association',
          },
          supported_networks: ['visa', 'mastercard', 'mada'],
          language: isArabic ? 'ar' : 'en',
          on_completed: async (payment) => {
            // Verify payment on server
            await supabase.functions.invoke('verify-invoice-payment', {
              body: { paymentId: payment.id, invoiceId: invoice.id },
            });
            navigate(`/invoice-success?invoiceId=${invoice.id}`);
          },
          on_failure: (error) => {
            console.error('Payment failed:', error);
            setPaymentError(isArabic ? 'فشل الدفع. يرجى المحاولة مرة أخرى.' : 'Payment failed. Please try again.');
          },
        });

        setMoyasarReady(true);
      } catch (err) {
        console.error('Payment init error:', err);
        setPaymentError(isArabic ? 'حدث خطأ في تهيئة الدفع' : 'Payment initialization error');
      } finally {
        setIsPaymentLoading(false);
      }
    };

    initPayment();
  }, [invoice, isArabic, isExpired, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                {isArabic ? 'الفاتورة غير موجودة' : 'Invoice Not Found'}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? 'الرابط غير صالح أو تم حذف الفاتورة' : 'The link is invalid or the invoice has been deleted'}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Status-specific rendering
  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                {isArabic ? 'تم الدفع بنجاح' : 'Payment Completed'}
              </h1>
              <p className="text-muted-foreground mb-4">
                {isArabic ? 'شكراً لك! تم استلام الدفع وسيتم إرسال التذاكر قريباً.' : 'Thank you! Payment received and tickets will be sent shortly.'}
              </p>
              <Badge className="bg-green-500/10 text-green-600">
                {invoice.invoice_number}
              </Badge>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (invoice.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                {isArabic ? 'الفاتورة ملغية' : 'Invoice Cancelled'}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? 'تم إلغاء هذه الفاتورة. يرجى التواصل للحصول على رابط جديد.' : 'This invoice has been cancelled. Please contact us for a new link.'}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (invoice.status === 'expired' || isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                {isArabic ? 'انتهت صلاحية الفاتورة' : 'Invoice Expired'}
              </h1>
              <p className="text-muted-foreground">
                {isArabic ? 'انتهت صلاحية رابط الدفع. يرجى التواصل للحصول على رابط جديد.' : 'The payment link has expired. Please contact us for a new link.'}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Non-production domain warning
  if (!isAllowedPaymentDomain()) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto py-12 px-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                {isArabic ? 'بيئة الاختبار' : 'Test Environment'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {isArabic 
                  ? 'الدفع متاح فقط على الموقع الرسمي. يرجى استخدام الرابط أدناه للدفع.'
                  : 'Payment is only available on the official website. Please use the link below to pay.'}
              </p>
              <Button asChild className="w-full">
                <a href={`https://almufaijer.com/invoice/${invoiceId}`}>
                  {isArabic ? 'الانتقال للموقع الرسمي' : 'Go to Official Site'}
                </a>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto py-8 px-4" dir={isArabic ? 'rtl' : 'ltr'}>
        <Card className="overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {isArabic ? 'فاتورة رقم' : 'Invoice No.'}
                </p>
                <CardTitle className="text-2xl">{invoice.invoice_number}</CardTitle>
              </div>
              <Badge variant="outline" className="gap-1">
                {invoice.client_type === 'company' ? (
                  <><Building2 className="h-3 w-3" /> {isArabic ? 'شركة' : 'Company'}</>
                ) : (
                  <><User className="h-3 w-3" /> {isArabic ? 'فرد' : 'Individual'}</>
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Client Info */}
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {invoice.company_name || invoice.client_name}
              </h3>
              <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
            </div>

            <Separator />

            {/* Visit Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</p>
                  <p className="font-medium">
                    {format(new Date(invoice.visit_date), 'PPP', { locale: isArabic ? ar : undefined })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'الوقت' : 'Time'}</p>
                  <p className="font-medium">{invoice.visit_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{isArabic ? 'عدد الزوار' : 'Visitors'}</p>
                  <p className="font-medium">
                    {invoice.num_adults} {isArabic ? 'بالغ' : 'Adults'}
                    {invoice.num_children > 0 && ` + ${invoice.num_children} ${isArabic ? 'طفل' : 'Children'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Services */}
            {invoice.services && invoice.services.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">{isArabic ? 'الخدمات المشمولة' : 'Included Services'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {invoice.services.map(serviceId => {
                      const service = SERVICES_MAP[serviceId];
                      return service ? (
                        <Badge key={serviceId} variant="secondary">
                          {isArabic ? service.ar : service.en}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Total */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg">{isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
                <span className="text-3xl font-bold text-primary">
                  {invoice.total_amount.toLocaleString()} <span className="text-lg">{isArabic ? 'ريال' : 'SAR'}</span>
                </span>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <h4 className="font-medium">{isArabic ? 'الدفع الآمن' : 'Secure Payment'}</h4>
              </div>

              {paymentError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {paymentError}
                </div>
              )}

              {isPaymentLoading && !moyasarReady && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              <div 
                ref={paymentFormRef}
                className="mysr-form"
                style={{ minHeight: moyasarReady ? 'auto' : '200px' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expiration Notice */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isArabic ? 'ينتهي رابط الدفع في:' : 'Payment link expires:'} {format(new Date(invoice.expires_at), 'PPp')}
        </p>
      </main>
      <Footer />
    </div>
  );
}
