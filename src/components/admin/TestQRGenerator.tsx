import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Clock, Calendar, Loader2, Trash2, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, subDays } from 'date-fns';
import QRCode from 'qrcode';

interface TestTicket {
  id: string;
  type: 'valid' | 'expired' | 'used' | 'wrong_date' | 'not_paid';
  ticketCode: string;
  qrCodeUrl: string;
  createdAt: Date;
}

const TEST_BOOKING_PREFIX = 'TEST-';

const TestQRGenerator = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  
  const [generating, setGenerating] = useState<string | null>(null);
  const [testTickets, setTestTickets] = useState<TestTicket[]>([]);
  const [clearing, setClearing] = useState(false);

  const generateTestTicket = async (type: 'valid' | 'expired' | 'used' | 'wrong_date' | 'not_paid') => {
    setGenerating(type);
    
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const ticketCode = `${TEST_BOOKING_PREFIX}${type.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const bookingRef = `${TEST_BOOKING_PREFIX}${Date.now().toString(36).toUpperCase()}`;
      
      // Determine dates based on ticket type
      let visitDate: string;
      let validFrom: string;
      let validUntil: string;
      
      switch (type) {
        case 'valid':
        case 'not_paid':
          visitDate = today;
          validFrom = today;
          validUntil = today;
          break;
        case 'expired':
          visitDate = format(subDays(now, 7), 'yyyy-MM-dd');
          validFrom = visitDate;
          validUntil = visitDate;
          break;
        case 'wrong_date':
          visitDate = format(addDays(now, 3), 'yyyy-MM-dd');
          validFrom = visitDate;
          validUntil = visitDate;
          break;
        case 'used':
          visitDate = today;
          validFrom = today;
          validUntil = today;
          break;
      }

      // Create test booking first
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_reference: bookingRef,
          customer_name: `Test User (${type})`,
          customer_email: 'test@almufaijer.com',
          customer_phone: '+966500000000',
          visit_date: visitDate,
          visit_time: '15:00',
          adult_count: 1,
          child_count: 0,
          adult_price: type === 'not_paid' ? 100 : 0,
          child_price: 0,
          total_amount: type === 'not_paid' ? 100 : 0,
          payment_status: type === 'not_paid' ? 'pending' : 'completed',
          booking_status: 'confirmed',
          language: 'en',
          qr_codes_generated: true,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Generate QR code data
      const qrData = JSON.stringify({
        code: ticketCode,
        ref: bookingRef,
        date: visitDate,
        time: '15:00',
        ts: Date.now(),
        cs: ticketCode.slice(-6),
      });

      // Generate QR code image - OPTIMIZED FOR SCREEN SCANNING
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 600,              // Larger for screen scanning
        margin: 4,               // More white space
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' }, // Pure black/white
      });

      // Create ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          booking_id: booking.id,
          ticket_code: ticketCode,
          ticket_type: 'adult',
          qr_code_data: qrData,
          qr_code_url: qrCodeDataUrl,
          valid_from: validFrom,
          valid_until: validUntil,
          is_used: type === 'used',
          scanned_at: type === 'used' ? new Date().toISOString() : null,
        });

      if (ticketError) throw ticketError;

      // Add to local state
      setTestTickets(prev => [...prev, {
        id: ticketCode,
        type,
        ticketCode,
        qrCodeUrl: qrCodeDataUrl,
        createdAt: new Date(),
      }]);

      toast({
        title: isArabic ? 'تم إنشاء تذكرة الاختبار' : 'Test Ticket Created',
        description: isArabic 
          ? `تم إنشاء تذكرة ${getTypeLabel(type, isArabic)} بنجاح`
          : `${getTypeLabel(type, isArabic)} test ticket created successfully`,
      });
    } catch (error) {
      console.error('Error generating test ticket:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إنشاء تذكرة الاختبار' : 'Failed to create test ticket',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  const clearTestTickets = async () => {
    setClearing(true);
    try {
      // Delete test bookings (tickets will cascade delete)
      const { error } = await supabase
        .from('bookings')
        .delete()
        .like('booking_reference', `${TEST_BOOKING_PREFIX}%`);

      if (error) throw error;

      setTestTickets([]);
      toast({
        title: isArabic ? 'تم المسح' : 'Cleared',
        description: isArabic ? 'تم حذف جميع تذاكر الاختبار' : 'All test tickets have been deleted',
      });
    } catch (error) {
      console.error('Error clearing test tickets:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حذف تذاكر الاختبار' : 'Failed to clear test tickets',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  const getTypeLabel = (type: string, arabic: boolean) => {
    switch (type) {
      case 'valid': return arabic ? 'صالحة' : 'Valid';
      case 'expired': return arabic ? 'منتهية' : 'Expired';
      case 'used': return arabic ? 'مستخدمة' : 'Used';
      case 'wrong_date': return arabic ? 'تاريخ خاطئ' : 'Wrong Date';
      case 'not_paid': return arabic ? 'غير مدفوع' : 'Not Paid';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'valid': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
      case 'expired': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'used': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      case 'wrong_date': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'not_paid': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'valid': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      case 'used': return <XCircle className="h-4 w-4" />;
      case 'wrong_date': return <Calendar className="h-4 w-4" />;
      case 'not_paid': return <CreditCard className="h-4 w-4" />;
      default: return null;
    }
  };

  const ticketTypes: Array<{ type: 'valid' | 'expired' | 'used' | 'wrong_date' | 'not_paid'; description: { en: string; ar: string } }> = [
    { type: 'valid', description: { en: 'Valid for today - should scan successfully', ar: 'صالحة لليوم - يجب أن تنجح المسح' } },
    { type: 'not_paid', description: { en: 'Payment pending - shows Mark as Paid option', ar: 'الدفع معلق - يظهر خيار تحديد كمدفوع' } },
    { type: 'expired', description: { en: 'Expired 7 days ago - should show expired', ar: 'منتهية منذ 7 أيام - يجب أن تظهر منتهية' } },
    { type: 'used', description: { en: 'Already scanned - should show already used', ar: 'تم مسحها - يجب أن تظهر مستخدمة' } },
    { type: 'wrong_date', description: { en: 'Valid for future date - should show wrong date', ar: 'صالحة لتاريخ مستقبلي - يجب أن تظهر تاريخ خاطئ' } },
  ];

  return (
    <Card className="glass-card border-accent/20 overflow-hidden">
      <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardTitle className="flex items-center gap-3 text-foreground rtl:flex-row-reverse">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <QrCode className="h-5 w-5 text-orange-600" />
          </div>
          {isArabic ? 'تذاكر الاختبار' : 'Test QR Codes'}
        </CardTitle>
        <CardDescription className="text-start rtl:text-end">
          {isArabic 
            ? 'إنشاء تذاكر اختبار لتدريب الموظفين على استخدام الماسح'
            : 'Generate test tickets for staff scanner training'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Generate Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ticketTypes.map(({ type, description }) => (
            <Button
              key={type}
              variant="outline"
              className={`h-auto py-4 px-4 flex flex-col items-start gap-2 border-2 hover:border-accent/50 transition-all ${
                generating === type ? 'opacity-70' : ''
              }`}
              onClick={() => generateTestTicket(type)}
              disabled={generating !== null}
            >
              <div className="flex items-center gap-2 w-full rtl:flex-row-reverse">
                {generating === type ? (
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                ) : (
                  <Badge className={`${getTypeColor(type)} border`}>
                    {getTypeIcon(type)}
                    <span className="ms-1">{getTypeLabel(type, isArabic)}</span>
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground text-start rtl:text-end w-full">
                {isArabic ? description.ar : description.en}
              </span>
            </Button>
          ))}
        </div>

        {/* Generated Tickets */}
        {testTickets.length > 0 && (
          <>
            <div className="flex items-center justify-between rtl:flex-row-reverse">
              <h4 className="font-medium text-foreground">
                {isArabic ? 'التذاكر المُنشأة' : 'Generated Tickets'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rtl:flex-row-reverse"
                onClick={clearTestTickets}
                disabled={clearing}
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Trash2 className="h-4 w-4 me-2" />
                )}
                {isArabic ? 'مسح الكل' : 'Clear All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {testTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="glass-card rounded-xl p-3 border border-accent/10 flex flex-col items-center gap-2"
                >
                  <Badge className={`${getTypeColor(ticket.type)} border text-xs`}>
                    {getTypeLabel(ticket.type, isArabic)}
                  </Badge>
                  <img 
                    src={ticket.qrCodeUrl} 
                    alt={`Test QR - ${ticket.type}`}
                    className="w-full max-w-[120px] aspect-square rounded-lg"
                  />
                  <code className="text-[10px] text-muted-foreground font-mono truncate w-full text-center">
                    {ticket.ticketCode}
                  </code>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Instructions */}
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <h4 className="font-medium text-foreground mb-3 text-start rtl:text-end">
            {isArabic ? 'تعليمات الاستخدام' : 'How to Use'}
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'انقر على نوع التذكرة لإنشاء رمز QR اختباري' : 'Click a ticket type to generate a test QR code'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'افتح صفحة الماسح على جهاز آخر' : 'Open the scanner page on another device'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'امسح رمز QR للتحقق من النتيجة المتوقعة' : 'Scan the QR code to verify the expected result'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'استخدم "مسح الكل" لحذف تذاكر الاختبار بعد الانتهاء' : 'Use "Clear All" to delete test tickets when done'}</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestQRGenerator;
