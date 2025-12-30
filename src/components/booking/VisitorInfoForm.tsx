import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MessageSquare, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const createFormSchema = (isArabic: boolean) => z.object({
  name: z.string()
    .min(3, isArabic ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters')
    .max(100, isArabic ? 'الاسم طويل جداً' : 'Name is too long'),
  email: z.string()
    .email(isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')
    .max(255, isArabic ? 'البريد الإلكتروني طويل جداً' : 'Email is too long'),
  phone: z.string()
    .regex(/^\+966[0-9]{9}$/, isArabic ? 'رقم الهاتف يجب أن يكون بصيغة +966XXXXXXXXX' : 'Phone must be in format +966XXXXXXXXX'),
  specialRequests: z.string().max(500).optional(),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const VisitorInfoForm = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { customerInfo, setCustomerInfo } = useBookingStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(isArabic)),
    defaultValues: {
      name: customerInfo.name || '',
      email: customerInfo.email || '',
      phone: customerInfo.phone || '+966',
      specialRequests: customerInfo.specialRequests || '',
    },
    mode: 'onChange',
  });

  const { formState: { errors, dirtyFields } } = form;

  useEffect(() => {
    const subscription = form.watch((values) => {
      setCustomerInfo({
        name: values.name || '',
        email: values.email || '',
        phone: values.phone || '',
        specialRequests: values.specialRequests || '',
      });
    });
    return () => subscription.unsubscribe();
  }, [form, setCustomerInfo]);

  const isFieldValid = (fieldName: keyof FormValues) => {
    return dirtyFields[fieldName] && !errors[fieldName];
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {isArabic ? 'معلومات الزائر' : 'Visitor Information'}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'أدخل بيانات الاتصال لإرسال التذاكر' : 'Enter contact details to receive your tickets'}
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <FormLabel className="flex items-center gap-2 text-base font-medium">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                    isFieldValid('name') ? 'gradient-bg' : 'bg-secondary'
                  )}>
                    {isFieldValid('name') ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <User className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  {isArabic ? 'الاسم الكامل' : 'Full Name'} *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={isArabic ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                    className={cn(
                      'h-14 text-base rounded-xl border-2 transition-all duration-300',
                      isFieldValid('name') && 'border-accent/50 bg-accent/5'
                    )}
                  />
                </FormControl>
                <FormMessage className="animate-fade-in" />
              </FormItem>
            )}
          />

          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <FormLabel className="flex items-center gap-2 text-base font-medium">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                    isFieldValid('email') ? 'gradient-bg' : 'bg-secondary'
                  )}>
                    {isFieldValid('email') ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Mail className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  {isArabic ? 'البريد الإلكتروني' : 'Email Address'} *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="example@email.com"
                    className={cn(
                      'h-14 text-base rounded-xl border-2 transition-all duration-300',
                      isFieldValid('email') && 'border-accent/50 bg-accent/5'
                    )}
                    dir="ltr"
                  />
                </FormControl>
                <FormMessage className="animate-fade-in" />
              </FormItem>
            )}
          />

          {/* Phone Field */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <FormLabel className="flex items-center gap-2 text-base font-medium">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                    isFieldValid('phone') ? 'gradient-bg' : 'bg-secondary'
                  )}>
                    {isFieldValid('phone') ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Phone className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  {isArabic ? 'رقم الجوال' : 'Phone Number'} *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    placeholder="+966501234567"
                    className={cn(
                      'h-14 text-base rounded-xl border-2 transition-all duration-300 font-mono',
                      isFieldValid('phone') && 'border-accent/50 bg-accent/5'
                    )}
                    dir="ltr"
                  />
                </FormControl>
                <FormMessage className="animate-fade-in" />
              </FormItem>
            )}
          />

          {/* Special Requests Field */}
          <FormField
            control={form.control}
            name="specialRequests"
            render={({ field }) => (
              <FormItem className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <FormLabel className="flex items-center gap-2 text-base font-medium">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-foreground" />
                  </div>
                  {isArabic ? 'طلبات خاصة' : 'Special Requests'}
                  <span className="text-muted-foreground text-sm font-normal">
                    ({isArabic ? 'اختياري' : 'Optional'})
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={isArabic ? 'أي طلبات أو ملاحظات خاصة...' : 'Any special requests or notes...'}
                    className="min-h-[100px] text-base resize-none rounded-xl border-2"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <div className="glass-card rounded-2xl p-4 text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <p className="text-sm text-muted-foreground">
          <Mail className="h-4 w-4 inline mr-2 rtl:ml-2 rtl:mr-0" />
          {isArabic 
            ? 'سيتم إرسال تأكيد الحجز والتذاكر إلى بريدك الإلكتروني'
            : 'Booking confirmation and tickets will be sent to your email'}
        </p>
      </div>
    </div>
  );
};

export default VisitorInfoForm;
