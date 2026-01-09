import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
const useLanguageWithLanguage = () => {
  const hook = useLanguage();
  return { ...hook, language: hook.currentLanguage };
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Plus, 
  Copy, 
  Mail, 
  Eye, 
  XCircle,
  Building2,
  User,
  Calendar as CalendarIcon,
  FileText,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  FileSearch
} from 'lucide-react';

// Generate invoice email preview HTML (mirrors the Edge Function template)
function generateInvoiceEmailPreview(invoice: CustomInvoice, previewLang: 'ar' | 'en' = 'ar'): string {
  const isPreviewArabic = previewLang === 'ar';
  const paymentLink = `https://almufaijer.com/invoice/${invoice.id}`;
  const expiresAt = new Date(invoice.expires_at).toLocaleDateString(isPreviewArabic ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const servicesList = (invoice.services || [])
    .map((s: string) => AVAILABLE_SERVICES.find(svc => svc.id === s))
    .filter(Boolean) as { id: string; en: string; ar: string }[];

  const texts = {
    ar: {
      invoiceNumber: 'فاتورة رقم',
      greeting: `عزيزي/عزيزتي ${invoice.client_name}،`,
      intro: 'شكراً لاختياركم سوق المفيجر. تجدون أدناه تفاصيل الفاتورة:',
      visitDate: 'تاريخ الزيارة',
      time: 'الوقت',
      visitors: 'عدد الزوار',
      services: 'الخدمات',
      totalAmount: 'المبلغ الإجمالي',
      currency: 'ريال',
      expires: 'ينتهي رابط الدفع في',
      payNow: 'ادفع الآن',
      adultsText: `${invoice.num_adults} بالغ${invoice.num_children > 0 ? ` + ${invoice.num_children} طفل` : ''}`,
      servicesText: servicesList.map(s => s.ar).join('، '),
    },
    en: {
      invoiceNumber: 'Invoice',
      greeting: `Dear ${invoice.client_name},`,
      intro: 'Thank you for choosing Souq Almufaijer. Please find your invoice details below:',
      visitDate: 'Visit Date',
      time: 'Time',
      visitors: 'Visitors',
      services: 'Services',
      totalAmount: 'Total Amount',
      currency: 'SAR',
      expires: 'Payment link expires',
      payNow: 'Pay Now',
      adultsText: `${invoice.num_adults} Adult${invoice.num_adults > 1 ? 's' : ''}${invoice.num_children > 0 ? ` + ${invoice.num_children} Child${invoice.num_children > 1 ? 'ren' : ''}` : ''}`,
      servicesText: servicesList.map(s => s.en).join(', '),
    },
  };

  const t = texts[previewLang];
  const dir = isPreviewArabic ? 'rtl' : 'ltr';
  const textAlign = isPreviewArabic ? 'right' : 'left';

  return `
<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f1e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #5C4A3A; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">سوق المفيجر</h1>
              <p style="color: #C9A86C; margin: 10px 0 0 0; font-size: 14px;">Souq Almufaijer</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: ${textAlign};">
                <h2 style="color: #3D2E1F; margin: 0 0 20px 0;">${t.invoiceNumber}: ${invoice.invoice_number}</h2>
                <p style="color: #3D2E1F; font-size: 16px; line-height: 1.6;">
                  ${t.greeting}
                </p>
                <p style="color: #3D2E1F; font-size: 16px; line-height: 1.6;">
                  ${t.intro}
                </p>
                
                <div style="background-color: #f5f1e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table width="100%" cellpadding="5">
                    <tr>
                      <td style="color: #3D2E1F;">${t.visitDate}:</td>
                      <td style="color: #3D2E1F; font-weight: bold;">${invoice.visit_date}</td>
                    </tr>
                    <tr>
                      <td style="color: #3D2E1F;">${t.time}:</td>
                      <td style="color: #3D2E1F; font-weight: bold;">${invoice.visit_time}</td>
                    </tr>
                    <tr>
                      <td style="color: #3D2E1F;">${t.visitors}:</td>
                      <td style="color: #3D2E1F; font-weight: bold;">${t.adultsText}</td>
                    </tr>
                    ${servicesList.length > 0 ? `
                    <tr>
                      <td style="color: #3D2E1F;">${t.services}:</td>
                      <td style="color: #3D2E1F; font-weight: bold;">${t.servicesText}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <div style="background-color: #5C4A3A; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #C9A86C;">${t.totalAmount}</p>
                  <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #ffffff;">${invoice.total_amount.toLocaleString()} ${t.currency}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  ${t.expires}: ${expiresAt}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${paymentLink}" style="display: inline-block; background-color: #5C4A3A; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  ${t.payNow}
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #3D2E1F; padding: 20px; text-align: center;">
              <p style="color: #C9A86C; margin: 0; font-size: 14px;">
                سوق المفيجر - Souq Almufaijer
              </p>
              <p style="color: #C9A86C; margin: 10px 0 0 0; font-size: 12px;">
                info@almufaijer.com
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
}

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
  notes: string | null;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  payment_id: string | null;
  paid_at: string | null;
  expires_at: string;
  booking_id: string | null;
  created_at: string;
}

const AVAILABLE_SERVICES = [
  { id: 'private_tour', en: 'Private Heritage Tour', ar: 'جولة تراثية خاصة' },
  { id: 'refreshments', en: 'Traditional Refreshments', ar: 'ضيافة تقليدية' },
  { id: 'photography', en: 'Professional Photography', ar: 'تصوير احترافي' },
  { id: 'vip_seating', en: 'VIP Seating', ar: 'مقاعد VIP' },
  { id: 'coordinator', en: 'Dedicated Coordinator', ar: 'منسق مخصص' },
  { id: 'custom_itinerary', en: 'Custom Itinerary', ar: 'برنامج مخصص' },
  { id: 'transportation', en: 'Transportation Arrangement', ar: 'ترتيب النقل' },
  { id: 'catering', en: 'Full Catering Service', ar: 'خدمة طعام كاملة' },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export function CustomInvoicesPanel() {
  const { currentLanguage } = useLanguage();
  const language = currentLanguage;
  const isArabic = language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomInvoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<CustomInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Form state
  const [clientType, setClientType] = useState<'company' | 'individual'>('individual');
  const [companyName, setCompanyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [totalAmount, setTotalAmount] = useState('');
  const [visitDate, setVisitDate] = useState<Date | undefined>();
  const [visitTime, setVisitTime] = useState('10:00');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState('7');
  const [notes, setNotes] = useState('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['custom-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomInvoice[];
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate invoice number
      const year = new Date().getFullYear();
      const count = (invoices?.length || 0) + 1;
      const invoiceNumber = `INV-${year}-${String(count).padStart(4, '0')}`;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

      const { data, error } = await supabase
        .from('custom_invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_type: clientType,
          company_name: clientType === 'company' ? companyName : null,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          total_amount: parseFloat(totalAmount),
          num_adults: numAdults,
          num_children: numChildren,
          services: selectedServices,
          visit_date: visitDate?.toISOString().split('T')[0],
          visit_time: visitTime,
          notes: notes || null,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-invoices'] });
      toast({
        title: isArabic ? 'تم إنشاء الفاتورة' : 'Invoice Created',
        description: isArabic ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully',
      });
      resetForm();
      setIsCreateOpen(false);
      
      // Copy link to clipboard
      const link = `${window.location.origin}/invoice/${data.id}`;
      navigator.clipboard.writeText(link);
      toast({
        title: isArabic ? 'تم نسخ الرابط' : 'Link Copied',
        description: isArabic ? 'تم نسخ رابط الدفع إلى الحافظة' : 'Payment link copied to clipboard',
      });
    },
    onError: (error) => {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إنشاء الفاتورة' : 'Failed to create invoice',
        variant: 'destructive',
      });
      console.error('Create invoice error:', error);
    },
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('custom_invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-invoices'] });
      toast({
        title: isArabic ? 'تم الإلغاء' : 'Cancelled',
        description: isArabic ? 'تم إلغاء الفاتورة' : 'Invoice cancelled',
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (invoice: CustomInvoice) => {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: isArabic ? 'تم الإرسال' : 'Sent',
        description: isArabic ? 'تم إرسال الفاتورة بالبريد الإلكتروني' : 'Invoice sent via email',
      });
    },
    onError: () => {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال البريد الإلكتروني' : 'Failed to send email',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setClientType('individual');
    setCompanyName('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setNumAdults(1);
    setNumChildren(0);
    setTotalAmount('');
    setVisitDate(undefined);
    setVisitTime('10:00');
    setSelectedServices([]);
    setExpiresIn('7');
    setNotes('');
  };

  const copyLink = (invoiceId: string) => {
    const link = `${window.location.origin}/invoice/${invoiceId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: isArabic ? 'تم النسخ' : 'Copied',
      description: isArabic ? 'تم نسخ الرابط' : 'Link copied to clipboard',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: { en: string; ar: string } }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-600', icon: <Clock className="h-3 w-3" />, label: { en: 'Pending', ar: 'معلق' } },
      paid: { color: 'bg-green-500/10 text-green-600', icon: <CheckCircle2 className="h-3 w-3" />, label: { en: 'Paid', ar: 'مدفوع' } },
      expired: { color: 'bg-gray-500/10 text-gray-600', icon: <Clock className="h-3 w-3" />, label: { en: 'Expired', ar: 'منتهي' } },
      cancelled: { color: 'bg-red-500/10 text-red-600', icon: <Ban className="h-3 w-3" />, label: { en: 'Cancelled', ar: 'ملغي' } },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {isArabic ? config.label.ar : config.label.en}
      </Badge>
    );
  };

  const filteredInvoices = invoices?.filter(inv => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterType !== 'all' && inv.client_type !== filterType) return false;
    return true;
  });

  const isFormValid = clientName && clientEmail && clientPhone && totalAmount && visitDate && visitTime && 
    (clientType === 'individual' || companyName);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {isArabic ? 'الفواتير المخصصة' : 'Custom Invoices'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isArabic ? 'إنشاء فواتير مخصصة للشركات والأفراد' : 'Create custom invoices for companies and individuals'}
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {isArabic ? 'إنشاء فاتورة' : 'Create Invoice'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isArabic ? 'إنشاء فاتورة مخصصة' : 'Create Custom Invoice'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Client Type */}
              <div className="space-y-2">
                <Label>{isArabic ? 'نوع العميل' : 'Client Type'}</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={clientType === 'individual' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setClientType('individual')}
                  >
                    <User className="h-4 w-4" />
                    {isArabic ? 'فرد' : 'Individual'}
                  </Button>
                  <Button
                    type="button"
                    variant={clientType === 'company' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setClientType('company')}
                  >
                    <Building2 className="h-4 w-4" />
                    {isArabic ? 'شركة' : 'Company'}
                  </Button>
                </div>
              </div>

              {/* Company Name (if company) */}
              {clientType === 'company' && (
                <div className="space-y-2">
                  <Label>{isArabic ? 'اسم الشركة' : 'Company Name'}</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isArabic ? 'أدخل اسم الشركة' : 'Enter company name'}
                  />
                </div>
              )}

              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'اسم العميل' : 'Client Name'}</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={isArabic ? 'أدخل الاسم' : 'Enter name'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? 'رقم الهاتف' : 'Phone'}</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  dir="ltr"
                />
              </div>

              {/* Visitors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'عدد البالغين' : 'Adults'}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={numAdults}
                    onChange={(e) => setNumAdults(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'عدد الأطفال' : 'Children'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={numChildren}
                    onChange={(e) => setNumChildren(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>{isArabic ? 'المبلغ الإجمالي (ريال)' : 'Total Amount (SAR)'}</Label>
                <Input
                  type="number"
                  min={1}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>

              {/* Visit Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {visitDate ? format(visitDate, 'PPP', { locale: isArabic ? ar : undefined }) : 
                          (isArabic ? 'اختر التاريخ' : 'Pick a date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={visitDate}
                        onSelect={setVisitDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'وقت الزيارة' : 'Visit Time'}</Label>
                  <Select value={visitTime} onValueChange={setVisitTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <Label>{isArabic ? 'الخدمات المتفق عليها' : 'Agreed Services'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SERVICES.map(service => (
                    <div key={service.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedServices([...selectedServices, service.id]);
                          } else {
                            setSelectedServices(selectedServices.filter(s => s !== service.id));
                          }
                        }}
                      />
                      <label htmlFor={service.id} className="text-sm cursor-pointer">
                        {isArabic ? service.ar : service.en}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label>{isArabic ? 'صلاحية الرابط' : 'Link Expires In'}</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">{isArabic ? '3 أيام' : '3 days'}</SelectItem>
                    <SelectItem value="7">{isArabic ? '7 أيام' : '7 days'}</SelectItem>
                    <SelectItem value="14">{isArabic ? '14 يوم' : '14 days'}</SelectItem>
                    <SelectItem value="30">{isArabic ? '30 يوم' : '30 days'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? 'ملاحظات داخلية' : 'Internal Notes'}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isArabic ? 'ملاحظات للفريق الداخلي...' : 'Notes for internal team...'}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => createInvoiceMutation.mutate()}
                disabled={!isFormValid || createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Plus className="h-4 w-4 me-2" />
                )}
                {isArabic ? 'إنشاء وإرسال الرابط' : 'Create & Get Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isArabic ? 'نوع العميل' : 'Client Type'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="company">{isArabic ? 'شركات' : 'Companies'}</SelectItem>
            <SelectItem value="individual">{isArabic ? 'أفراد' : 'Individuals'}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="pending">{isArabic ? 'معلق' : 'Pending'}</SelectItem>
            <SelectItem value="paid">{isArabic ? 'مدفوع' : 'Paid'}</SelectItem>
            <SelectItem value="expired">{isArabic ? 'منتهي' : 'Expired'}</SelectItem>
            <SelectItem value="cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredInvoices?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isArabic ? 'لا توجد فواتير' : 'No invoices found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices?.map(invoice => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">
                        {invoice.invoice_number}
                      </span>
                      {getStatusBadge(invoice.status)}
                      <Badge variant="outline" className="gap-1">
                        {invoice.client_type === 'company' ? (
                          <><Building2 className="h-3 w-3" /> {isArabic ? 'شركة' : 'Company'}</>
                        ) : (
                          <><User className="h-3 w-3" /> {isArabic ? 'فرد' : 'Individual'}</>
                        )}
                      </Badge>
                    </div>
                    <h3 className="font-semibold">
                      {invoice.company_name || invoice.client_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {invoice.client_email} • {invoice.client_phone}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        {isArabic ? 'الزوار:' : 'Visitors:'} {invoice.num_adults + invoice.num_children}
                      </span>
                      <span>
                        {isArabic ? 'التاريخ:' : 'Date:'} {format(new Date(invoice.visit_date), 'PP')}
                      </span>
                      <span className="font-semibold text-primary">
                        {invoice.total_amount.toLocaleString()} {isArabic ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => copyLink(invoice.id)}
                        >
                          <Copy className="h-3 w-3" />
                          {isArabic ? 'نسخ' : 'Copy'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setPreviewInvoice(invoice)}
                        >
                          <FileSearch className="h-3 w-3" />
                          {isArabic ? 'معاينة' : 'Preview'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => sendEmailMutation.mutate(invoice)}
                          disabled={sendEmailMutation.isPending}
                        >
                          <Mail className="h-3 w-3" />
                          {isArabic ? 'إرسال' : 'Email'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => cancelInvoiceMutation.mutate(invoice.id)}
                        >
                          <XCircle className="h-3 w-3" />
                          {isArabic ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="h-3 w-3" />
                      {isArabic ? 'عرض' : 'View'}
                    </Button>
                    {invoice.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'العميل:' : 'Client:'}</span>
                  <p className="font-medium">{selectedInvoice.company_name || selectedInvoice.client_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'الحالة:' : 'Status:'}</span>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'البريد:' : 'Email:'}</span>
                  <p className="font-medium">{selectedInvoice.client_email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'الهاتف:' : 'Phone:'}</span>
                  <p className="font-medium" dir="ltr">{selectedInvoice.client_phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'عدد البالغين:' : 'Adults:'}</span>
                  <p className="font-medium">{selectedInvoice.num_adults}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'عدد الأطفال:' : 'Children:'}</span>
                  <p className="font-medium">{selectedInvoice.num_children}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'تاريخ الزيارة:' : 'Visit Date:'}</span>
                  <p className="font-medium">{format(new Date(selectedInvoice.visit_date), 'PPP')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isArabic ? 'وقت الزيارة:' : 'Visit Time:'}</span>
                  <p className="font-medium">{selectedInvoice.visit_time}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{isArabic ? 'المبلغ:' : 'Amount:'}</span>
                  <p className="font-bold text-xl text-primary">
                    {selectedInvoice.total_amount.toLocaleString()} {isArabic ? 'ريال سعودي' : 'SAR'}
                  </p>
                </div>
              </div>

              {selectedInvoice.services && selectedInvoice.services.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">{isArabic ? 'الخدمات:' : 'Services:'}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedInvoice.services.map(serviceId => {
                      const service = AVAILABLE_SERVICES.find(s => s.id === serviceId);
                      return service ? (
                        <Badge key={serviceId} variant="secondary">
                          {isArabic ? service.ar : service.en}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">{isArabic ? 'ملاحظات:' : 'Notes:'}</span>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedInvoice.notes}</p>
                </div>
              )}

              {selectedInvoice.paid_at && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {isArabic ? 'تم الدفع في:' : 'Paid at:'} {format(new Date(selectedInvoice.paid_at), 'PPp')}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {isArabic ? 'معاينة البريد الإلكتروني' : 'Email Preview'}
              {previewInvoice && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {previewInvoice.invoice_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">{isArabic ? 'إلى:' : 'To:'}</span>{' '}
                    <span className="font-medium">{previewInvoice.client_email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isArabic ? 'الموضوع:' : 'Subject:'}</span>{' '}
                    <span className="font-medium">
                      {isArabic 
                        ? `فاتورة من سوق المفيجر - ${previewInvoice.invoice_number}` 
                        : `Invoice from Souq Almufaijer - ${previewInvoice.invoice_number}`}
                    </span>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="h-[60vh] border rounded-lg bg-white">
                <iframe
                  srcDoc={generateInvoiceEmailPreview(previewInvoice)}
                  className="w-full h-[800px] border-0"
                  title="Email Preview"
                />
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewInvoice(null)}>
                  {isArabic ? 'إغلاق' : 'Close'}
                </Button>
                <Button 
                  onClick={() => {
                    sendEmailMutation.mutate(previewInvoice);
                    setPreviewInvoice(null);
                  }}
                  disabled={sendEmailMutation.isPending}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {isArabic ? 'إرسال البريد الإلكتروني' : 'Send Email'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomInvoicesPanel;
