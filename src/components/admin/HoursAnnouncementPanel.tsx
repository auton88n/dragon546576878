import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Users, Clock, AlertCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Edit3, RefreshCw, Eye, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Customer {
  email: string;
  name: string;
  language: string;
}

interface CustomContent {
  subjectEn: string;
  subjectAr: string;
  messageEn: string;
  messageAr: string;
  daysEn: string;
  daysAr: string;
  hoursEn: string;
  hoursAr: string;
  closingEn: string;
  closingAr: string;
}

const defaultContent: CustomContent = {
  subjectEn: 'Operating Hours Update - Souq Almufaijer',
  subjectAr: 'تحديث ساعات العمل - سوق المفيجر',
  messageEn: 'We would like to inform you about our operating hours at Souq Almufaijer Heritage Site:',
  messageAr: 'نود إعلامكم بساعات العمل في موقع سوق المفيجر التراثي:',
  daysEn: 'Open Daily (Including Fridays)',
  daysAr: 'مفتوح يومياً (بما في ذلك الجمعة)',
  hoursEn: '3:00 PM - 12:00 AM (Midnight)',
  hoursAr: '٣:٠٠ م - ١٢:٠٠ ص (منتصف الليل)',
  closingEn: 'Your tickets are valid anytime during these hours on your selected visit date.',
  closingAr: 'تذاكركم صالحة في أي وقت خلال هذه الساعات في تاريخ زيارتكم المحدد.',
};

// Generate email HTML for preview
const generateEmailPreview = (language: 'en' | 'ar', customerName: string, content: CustomContent): string => {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  
  const subject = isArabic ? content.subjectAr : content.subjectEn;
  const message = isArabic ? content.messageAr : content.messageEn;
  const days = isArabic ? content.daysAr : content.daysEn;
  const hours = isArabic ? content.hoursAr : content.hoursEn;
  const closing = isArabic ? content.closingAr : content.closingEn;

  // Split days text
  const daysMatch = days.match(/^([^(]+)(\(.+\))?$/);
  const daysMain = daysMatch?.[1]?.trim() || days;
  const daysSub = daysMatch?.[2]?.trim() || '';

  // Split hours text
  const hoursMatch = hours.match(/^([^(]+)(\(.+\))?$/);
  const hoursMain = hoursMatch?.[1]?.trim() || hours;
  const hoursSub = hoursMatch?.[2]?.trim() || '';
  
  return `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F1E8; direction: ${dir};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 111, 71, 0.15);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B6F47 0%, #6B5A3A 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                ${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
              </h1>
              <p style="color: #ffffff; margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">
                ${isArabic ? 'تحديث ساعات العمل' : 'Operating Hours Update'}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4A3625; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6;">
                ${isArabic ? `زائرنا الكريم ${customerName}،` : `Dear ${customerName},`}
              </p>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 30px 0; line-height: 1.7;">
                ${message}
              </p>
              
              <!-- Hours Box - Dark background for Gmail Dark Mode compatibility -->
              <table role="presentation" style="width: 100%; border-radius: 12px; margin-bottom: 30px;" bgcolor="#4A3625">
                <tr>
                  <td bgcolor="#4A3625" style="background-color: #4A3625; padding: 30px; text-align: center; border-radius: 12px;">
                    <div style="margin-bottom: 16px;">
                      <span style="font-size: 28px;">📅</span>
                      <p style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 8px 0 0 0;">
                        ${daysMain}
                      </p>
                      ${daysSub ? `<p style="color: #D4C5B0; font-size: 16px; font-weight: 600; margin: 4px 0 0 0;">${daysSub}</p>` : ''}
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 16px;">
                      <span style="font-size: 28px;">⏰</span>
                      <p style="color: #FFFFFF; font-size: 32px; font-weight: 800; margin: 8px 0 0 0;">
                        ${hoursMain}
                      </p>
                      ${hoursSub ? `<p style="color: #D4C5B0; font-size: 16px; font-weight: 600; margin: 4px 0 0 0;">${hoursSub}</p>` : ''}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 24px 0; line-height: 1.7;">
                ${closing}
              </p>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 8px 0; line-height: 1.7;">
                ${isArabic ? 'للاستفسارات، تواصلوا معنا على:' : 'If you have any questions, please contact us at:'}
              </p>
              <p style="margin: 0 0 30px 0;">
                <a href="mailto:info@almufaijer.com" style="color: #8B6F47; font-weight: 600; text-decoration: none;">info@almufaijer.com</a>
              </p>
              
              <p style="color: #4A3625; font-size: 18px; font-weight: 600; margin: 0; line-height: 1.6;">
                ${isArabic ? 'نتطلع لاستقبالكم!' : 'We look forward to welcoming you!'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625; padding: 24px 30px; text-align: center;">
              <p style="color: #D4C5B0; font-size: 14px; margin: 0 0 8px 0;">
                ${isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}
              </p>
              <p style="color: #A89880; font-size: 12px; margin: 0;">
                ${isArabic ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const HoursAnnouncementPanel = () => {
  const { i18n } = useTranslation();
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
  const [showCustomize, setShowCustomize] = useState(false);
  const [customContent, setCustomContent] = useState<CustomContent>(defaultContent);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'ar'>('en');

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    return generateEmailPreview(previewLanguage, 'Test User', customContent);
  }, [previewLanguage, customContent]);

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
        body: { testEmail, customContent },
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
        body: { sendToAll: true, customContent },
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

  const handleResetContent = () => {
    setCustomContent(defaultContent);
    toast.info(isArabic ? 'تم استعادة المحتوى الافتراضي' : 'Content reset to defaults');
  };

  const updateContent = (field: keyof CustomContent, value: string) => {
    setCustomContent(prev => ({ ...prev, [field]: value }));
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
              ? 'أرسل بريداً للعملاء لإعلامهم بساعات العمل الجديدة'
              : 'Send email to customers about new operating hours'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customize Message Section */}
          <Collapsible open={showCustomize} onOpenChange={setShowCustomize}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-amber-300 hover:bg-amber-100">
                <span className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  {isArabic ? 'تخصيص محتوى الرسالة' : 'Customize Message Content'}
                </span>
                {showCustomize ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 border rounded-lg p-4 bg-white">
              {/* Subject */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'العنوان (EN)' : 'Subject (EN)'}</Label>
                  <Input 
                    value={customContent.subjectEn}
                    onChange={(e) => updateContent('subjectEn', e.target.value)}
                    placeholder="Subject in English"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'العنوان (AR)' : 'Subject (AR)'}</Label>
                  <Input 
                    value={customContent.subjectAr}
                    onChange={(e) => updateContent('subjectAr', e.target.value)}
                    placeholder="العنوان بالعربية"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Opening Message */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'الرسالة الافتتاحية (EN)' : 'Opening Message (EN)'}</Label>
                  <Textarea 
                    value={customContent.messageEn}
                    onChange={(e) => updateContent('messageEn', e.target.value)}
                    placeholder="Opening message in English"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'الرسالة الافتتاحية (AR)' : 'Opening Message (AR)'}</Label>
                  <Textarea 
                    value={customContent.messageAr}
                    onChange={(e) => updateContent('messageAr', e.target.value)}
                    placeholder="الرسالة الافتتاحية بالعربية"
                    dir="rtl"
                    rows={2}
                  />
                </div>
              </div>

              {/* Days */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'أيام العمل (EN)' : 'Days Open (EN)'}</Label>
                  <Input 
                    value={customContent.daysEn}
                    onChange={(e) => updateContent('daysEn', e.target.value)}
                    placeholder="Open Daily (Including Fridays)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'أيام العمل (AR)' : 'Days Open (AR)'}</Label>
                  <Input 
                    value={customContent.daysAr}
                    onChange={(e) => updateContent('daysAr', e.target.value)}
                    placeholder="مفتوح يومياً (بما في ذلك الجمعة)"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Hours */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'ساعات العمل (EN)' : 'Hours (EN)'}</Label>
                  <Input 
                    value={customContent.hoursEn}
                    onChange={(e) => updateContent('hoursEn', e.target.value)}
                    placeholder="3:00 PM - 12:00 AM (Midnight)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'ساعات العمل (AR)' : 'Hours (AR)'}</Label>
                  <Input 
                    value={customContent.hoursAr}
                    onChange={(e) => updateContent('hoursAr', e.target.value)}
                    placeholder="٣:٠٠ م - ١٢:٠٠ ص (منتصف الليل)"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Closing Message */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'الرسالة الختامية (EN)' : 'Closing Message (EN)'}</Label>
                  <Textarea 
                    value={customContent.closingEn}
                    onChange={(e) => updateContent('closingEn', e.target.value)}
                    placeholder="Closing message in English"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{isArabic ? 'الرسالة الختامية (AR)' : 'Closing Message (AR)'}</Label>
                  <Textarea 
                    value={customContent.closingAr}
                    onChange={(e) => updateContent('closingAr', e.target.value)}
                    placeholder="الرسالة الختامية بالعربية"
                    dir="rtl"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleResetContent} className="flex-1">
                  <RefreshCw className="h-4 w-4 me-2" />
                  {isArabic ? 'استعادة الافتراضي' : 'Reset to Defaults'}
                </Button>
                <Button variant="secondary" onClick={() => setShowPreview(true)} className="flex-1">
                  <Eye className="h-4 w-4 me-2" />
                  {isArabic ? 'معاينة البريد' : 'Preview Email'}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview Button (always visible) */}
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)} 
            className="w-full border-amber-300 hover:bg-amber-100"
          >
            <Eye className="h-4 w-4 me-2" />
            {isArabic ? 'معاينة البريد الإلكتروني' : 'Preview Email'}
          </Button>

          {/* New Hours Info */}
          <Alert className="border-amber-300 bg-amber-100">
            <Clock className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-800">
              <strong>{isArabic ? 'الساعات:' : 'Hours:'}</strong>{' '}
              {customContent.hoursEn} - {customContent.daysEn}
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

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {isArabic ? 'معاينة البريد الإلكتروني' : 'Email Preview'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <Tabs value={previewLanguage} onValueChange={(v) => setPreviewLanguage(v as 'en' | 'ar')}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="mt-0">
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  <div className="bg-white px-4 py-2 border-b text-sm text-muted-foreground">
                    <strong>Subject:</strong> {customContent.subjectEn}
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[500px] bg-white"
                    title="Email Preview (English)"
                  />
                </div>
              </TabsContent>
              <TabsContent value="ar" className="mt-0">
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  <div className="bg-white px-4 py-2 border-b text-sm text-muted-foreground" dir="rtl">
                    <strong>العنوان:</strong> {customContent.subjectAr}
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[500px] bg-white"
                    title="Email Preview (Arabic)"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

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