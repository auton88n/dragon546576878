import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Users, Clock, AlertCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Customer {
  email: string;
  name: string;
  language: string;
}

export const HoursAnnouncementPanel = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [testEmail, setTestEmail] = useState('crossmint7@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [allSent, setAllSent] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [showCustomerList, setShowCustomerList] = useState(false);

  // Fetch unique customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('customer_email, customer_name, language')
          .eq('booking_status', 'confirmed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Deduplicate by email
        const uniqueCustomers = new Map<string, Customer>();
        for (const booking of bookings || []) {
          if (!uniqueCustomers.has(booking.customer_email)) {
            uniqueCustomers.set(booking.customer_email, {
              email: booking.customer_email,
              name: booking.customer_name,
              language: booking.language || 'ar'
            });
          }
        }
        setCustomers(Array.from(uniqueCustomers.values()));
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error(isArabic ? 'الرجاء إدخال البريد الإلكتروني' : 'Please enter an email address');
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-hours-announcement', {
        body: { testEmail },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(isArabic ? 'تم إرسال البريد التجريبي بنجاح' : 'Test email sent successfully');
        setTestSent(true);
      } else {
        throw new Error(data?.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(isArabic ? 'فشل إرسال البريد التجريبي' : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleResetTest = () => {
    setTestSent(false);
    toast.info(isArabic ? 'يمكنك الآن إرسال بريد تجريبي آخر' : 'You can now send another test email');
  };

  const handleSendToAll = async () => {
    setShowConfirmDialog(false);
    setIsSendingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-hours-announcement', {
        body: { sendToAll: true },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || (isArabic ? 'تم إرسال الإعلان للجميع' : 'Announcement sent to all customers'));
        setAllSent(true);
      } else {
        throw new Error(data?.error || 'Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error(isArabic ? 'فشل إرسال الإعلان' : 'Failed to send announcement');
    } finally {
      setIsSendingAll(false);
    }
  };

  const customerCount = customers.length;

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Clock className="h-5 w-5" />
            {isArabic ? 'إعلان ساعات العمل الجديدة' : 'Operating Hours Announcement'}
          </CardTitle>
          <CardDescription className="text-amber-700">
            {isArabic 
              ? 'أرسل بريداً للعملاء لإعلامهم بساعات العمل الجديدة: ٣ مساءً - ١٢ منتصف الليل، مفتوح يومياً'
              : 'Send email to customers about new hours: 3 PM - 12 AM, Open Daily'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New Hours Info */}
          <Alert className="border-amber-300 bg-amber-100">
            <Clock className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-800">
              <strong>{isArabic ? 'الساعات الجديدة:' : 'New Hours:'}</strong>{' '}
              {isArabic ? '٣:٠٠ م - ١٢:٠٠ ص (منتصف الليل) - مفتوح يومياً' : '3:00 PM - 12:00 AM (Midnight) - Open Daily'}
            </AlertDescription>
          </Alert>

          {/* Step 1: Test Email */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className="bg-amber-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
              {isArabic ? 'إرسال بريد تجريبي' : 'Send Test Email'}
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
                disabled={isSendingTest}
              />
              <Button
                onClick={handleSendTest}
                disabled={isSendingTest || (testSent && !allSent)}
                variant={testSent ? "outline" : "default"}
                className={testSent ? "bg-green-100 text-green-700 border-green-300" : ""}
              >
                {isSendingTest ? (
                  <span className="animate-spin">⏳</span>
                ) : testSent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 me-2" />
                    {isArabic ? 'تم الإرسال' : 'Sent'}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 me-2" />
                    {isArabic ? 'إرسال تجريبي' : 'Send Test'}
                  </>
                )}
              </Button>
              {testSent && !allSent && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResetTest}
                  title={isArabic ? 'إعادة المحاولة' : 'Reset'}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
            {testSent && (
              <p className="text-sm text-green-700">
                ✓ {isArabic ? 'تحقق من بريدك الإلكتروني، ثم أرسل للجميع' : 'Check your email, then send to all customers'}
              </p>
            )}
          </div>

          {/* Step 2: Send to All */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <span className={`rounded-full w-5 h-5 flex items-center justify-center text-xs ${testSent ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</span>
              {isArabic 
                ? `إرسال للجميع (${isLoadingCustomers ? '...' : customerCount} ${customerCount === 1 ? 'عميل' : 'عملاء'})`
                : `Send to All (${isLoadingCustomers ? '...' : customerCount} customer${customerCount !== 1 ? 's' : ''})`}
            </Label>
            
            {!testSent && (
              <Alert variant="default" className="border-gray-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {isArabic ? 'أرسل بريداً تجريبياً أولاً للتحقق من المحتوى' : 'Send a test email first to verify the content'}
                </AlertDescription>
              </Alert>
            )}

            {/* Customer List Preview */}
            {testSent && !allSent && customerCount > 0 && (
              <Collapsible open={showCustomerList} onOpenChange={setShowCustomerList}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-amber-700 hover:bg-amber-100">
                    {isArabic ? 'عرض قائمة العملاء' : 'Preview Recipients'}
                    {showCustomerList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-lg p-3 bg-white max-h-48 overflow-y-auto space-y-2">
                    {customers.map((customer, idx) => (
                      <div key={customer.email} className="flex items-center gap-2 text-sm py-1 border-b last:border-b-0">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground truncate">{customer.email}</span>
                        <span className="ms-auto text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {customer.language === 'ar' ? 'AR' : 'EN'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!testSent || isSendingAll || allSent}
              variant={allSent ? "outline" : "default"}
              className={`w-full ${allSent ? "bg-green-100 text-green-700 border-green-300" : ""}`}
            >
              {isSendingAll ? (
                <span className="animate-spin me-2">⏳</span>
              ) : allSent ? (
                <CheckCircle2 className="h-4 w-4 me-2" />
              ) : (
                <Users className="h-4 w-4 me-2" />
              )}
              {allSent 
                ? (isArabic ? 'تم إرسال الإعلان للجميع' : 'Announcement Sent to All')
                : (isArabic ? 'إرسال للجميع' : 'Send to All Customers')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'تأكيد إرسال الإعلان' : 'Confirm Send Announcement'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {isArabic 
                  ? `هل أنت متأكد من إرسال الإعلان إلى ${customerCount} ${customerCount === 1 ? 'عميل' : 'عملاء'}؟`
                  : `Are you sure you want to send this announcement to ${customerCount} customer${customerCount !== 1 ? 's' : ''}?`}
              </p>
              <div className="border rounded-lg p-3 bg-muted/50 max-h-32 overflow-y-auto text-sm">
                {customers.slice(0, 5).map((c) => (
                  <div key={c.email} className="truncate">{c.name} - {c.email}</div>
                ))}
                {customers.length > 5 && (
                  <div className="text-muted-foreground mt-1">
                    {isArabic ? `و ${customers.length - 5} آخرين...` : `and ${customers.length - 5} more...`}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSendToAll}>
              {isArabic ? 'نعم، أرسل للجميع' : 'Yes, Send to All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
