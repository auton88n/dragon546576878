import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Calendar, Clock, CheckCircle, Sparkles, FileText } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
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
  const { customerInfo, setCustomerInfo, totalAmount } = useBookingStore();

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
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !termsAccepted) return;
    // No payment - just confirm booking
    onPaymentComplete('PENDING');
  };

  const canSubmit = isValid && termsAccepted && !isProcessing;

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

      {/* Pending Payment Notice */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">2</span>
          {isArabic ? 'تأكيد الحجز' : 'Confirm Reservation'}
        </h3>

        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {isArabic 
                ? 'سيتم إرسال رابط الدفع لاحقاً'
                : 'Payment link will be sent later'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? 'أكد حجزك الآن وسنرسل لك رابط الدفع عبر البريد الإلكتروني قريباً. حجزك محفوظ حتى يتم الدفع.'
              : 'Confirm your reservation now and we will send you a payment link via email soon. Your booking is held until payment is completed.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Confirm Button */}
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
            {isProcessing ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {isArabic ? 'جاري المعالجة...' : 'Processing...'}
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" />
                {isArabic ? 'تأكيد الحجز' : 'Confirm Booking'}
              </span>
            )}
          </Button>

          {/* Amount Display */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'المبلغ المستحق:' : 'Amount due:'}{' '}
              <span className="font-semibold text-accent">{totalAmount} {isArabic ? 'ر.س' : 'SAR'}</span>
            </p>
          </div>
        </form>
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
            <Mail className="h-4 w-4 text-accent" />
          </div>
          <span className="text-xs font-medium">{isArabic ? 'تأكيد بريدي' : 'Email Confirm'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <CheckCircle className="h-4 w-4 text-accent" />
          </div>
          <span className="text-xs font-medium">{isArabic ? 'محفوظ' : 'Reserved'}</span>
        </div>
      </div>
    </div>
  );
};

export default DetailsAndPayment;
