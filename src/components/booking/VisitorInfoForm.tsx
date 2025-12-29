import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  const { t, currentLanguage } = useLanguage();
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

  // Update store whenever form values change
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('booking.visitorInfo')}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'أدخل معلومات الاتصال الخاصة بك' : 'Enter your contact information'}
        </p>
      </div>

      <Card className="border-2">
        <CardContent className="p-6">
          <Form {...form}>
            <form className="space-y-6">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4 text-primary" />
                      {t('booking.name')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={isArabic ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                        className="h-12 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4 text-primary" />
                      {t('booking.email')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={isArabic ? 'example@email.com' : 'example@email.com'}
                        className="h-12 text-base"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Field */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base">
                      <Phone className="h-4 w-4 text-primary" />
                      {t('booking.phone')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+966501234567"
                        className="h-12 text-base"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Requests Field */}
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      {t('booking.specialRequests')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={isArabic ? 'أي طلبات خاصة أو ملاحظات...' : 'Any special requests or notes...'}
                        className="min-h-[100px] text-base resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        {isArabic 
          ? '* سيتم إرسال تأكيد الحجز والتذاكر إلى بريدك الإلكتروني'
          : '* Booking confirmation and tickets will be sent to your email'}
      </p>
    </div>
  );
};

export default VisitorInfoForm;
