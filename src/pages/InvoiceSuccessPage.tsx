import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  Users, 
  Mail, 
  Phone,
  Building2,
  User
} from 'lucide-react';

export default function InvoiceSuccessPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-success', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto pt-24 pb-8 px-4" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isArabic ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic 
              ? 'شكراً لك! سيتم إرسال التذاكر إلى بريدك الإلكتروني قريباً.'
              : 'Thank you! Your tickets will be sent to your email shortly.'}
          </p>
        </div>

        {/* Invoice Summary */}
        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex justify-between items-center">
              <CardTitle>{isArabic ? 'ملخص الحجز' : 'Booking Summary'}</CardTitle>
              <Badge className="bg-green-500/10 text-green-600 gap-1">
                <CheckCircle className="h-3 w-3" />
                {isArabic ? 'مدفوع' : 'Paid'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Invoice Number */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                {isArabic ? 'رقم الفاتورة' : 'Invoice Number'}
              </p>
              <p className="text-2xl font-mono font-bold">{invoice.invoice_number}</p>
            </div>

            {/* Client Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {invoice.client_type === 'company' ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{invoice.company_name || invoice.client_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {invoice.client_email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span dir="ltr">{invoice.client_phone}</span>
              </div>
            </div>

            {/* Visit Details */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-sm">
                  {format(new Date(invoice.visit_date), 'PP', { locale: isArabic ? ar : undefined })}
                </p>
              </div>
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? 'الوقت' : 'Time'}</p>
                <p className="font-medium text-sm">{invoice.visit_time}</p>
              </div>
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? 'الزوار' : 'Visitors'}</p>
                <p className="font-medium text-sm">{invoice.num_adults + invoice.num_children}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                {isArabic ? 'المبلغ المدفوع' : 'Amount Paid'}
              </p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                {invoice.total_amount.toLocaleString()} {isArabic ? 'ريال' : 'SAR'}
              </p>
            </div>

            {/* Email Notice */}
            <div className="text-center p-4 border rounded-lg">
              <Mail className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm">
                {isArabic 
                  ? 'سيتم إرسال تأكيد الحجز والتذاكر إلى بريدك الإلكتروني خلال دقائق.'
                  : 'A confirmation email with your tickets will be sent to your email within minutes.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {isArabic 
            ? 'لأي استفسارات، يرجى التواصل معنا عبر البريد الإلكتروني: info@almufaijer.com'
            : 'For any inquiries, please contact us at: info@almufaijer.com'}
        </p>
      </main>
      <Footer />
    </div>
  );
}
