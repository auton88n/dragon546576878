import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, CreditCard, Lock, Shield, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface DetailsAndPaymentProps {
  onPaymentComplete: (paymentId: string) => void;
  isProcessing: boolean;
}

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
  const { customerInfo, setCustomerInfo, totalAmount, canProceed } = useBookingStore();

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

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

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const isCardValid = 
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiryDate.length === 5 &&
    cvv.length >= 3 &&
    cardName.length >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !isCardValid) return;
    const mockPaymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onPaymentComplete(mockPaymentId);
  };

  const isFormComplete = isValid && isCardValid;

  return (
    <div className="space-y-8">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center">1</span>
          {isArabic ? 'معلومات الاتصال' : 'Contact Information'}
        </h3>

        <Form {...form}>
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {isArabic ? 'الاسم الكامل' : 'Full Name'} *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder={isArabic ? 'أدخل اسمك' : 'Enter your name'}
                        className="pl-10 rtl:pr-10 rtl:pl-4 h-11 rounded-lg"
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
                    <div className="relative">
                      <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@email.com"
                        className="pl-10 rtl:pr-10 rtl:pl-4 h-11 rounded-lg"
                        dir="ltr"
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
                    <div className="relative">
                      <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+966501234567"
                        className="pl-10 rtl:pr-10 rtl:pl-4 h-11 rounded-lg font-mono"
                        dir="ltr"
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

      {/* Payment Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center">2</span>
          {isArabic ? 'معلومات الدفع' : 'Payment Information'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isArabic ? 'رقم البطاقة' : 'Card Number'}
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className="pl-10 rtl:pr-10 rtl:pl-4 h-11 rounded-lg font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isArabic ? 'الاسم على البطاقة' : 'Name on Card'}
            </Label>
            <Input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder={isArabic ? 'الاسم كما يظهر على البطاقة' : 'Name as it appears on card'}
              className="h-11 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {isArabic ? 'تاريخ الانتهاء' : 'Expiry'}
              </Label>
              <Input
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                placeholder="MM/YY"
                className="h-11 rounded-lg font-mono"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">CVV</Label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                type="password"
                className="h-11 rounded-lg font-mono"
                dir="ltr"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <Lock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? 'معلومات بطاقتك محمية بتشفير SSL'
                : 'Your card information is protected with SSL encryption'}
            </p>
          </div>

          {/* Pay Button */}
          <Button
            type="submit"
            size="lg"
            className={cn(
              'w-full h-12 text-base rounded-lg transition-all',
              isFormComplete && !isProcessing 
                ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
            disabled={!isFormComplete || isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {isArabic ? 'جاري المعالجة...' : 'Processing...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {isArabic ? `ادفع ${totalAmount} ر.س` : `Pay ${totalAmount} SAR`}
              </span>
            )}
          </Button>

          {/* Demo Notice */}
          <div className="text-center text-xs text-muted-foreground">
            ⚠️ {isArabic ? 'نموذج تجريبي' : 'Demo mode'}
          </div>
        </form>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 pt-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-xs">{isArabic ? 'آمن' : 'Secure'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs">{isArabic ? 'مشفر' : 'Encrypted'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs">{isArabic ? 'موثوق' : 'Trusted'}</span>
        </div>
      </div>
    </div>
  );
};

export default DetailsAndPayment;
