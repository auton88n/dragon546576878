import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import CooldownNotice from '@/components/shared/CooldownNotice';

const contactSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  email: z.string().trim().email('Please enter a valid email').max(255),
  phone: z.string().optional(),
  subject: z.string().trim().min(3, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000)
});

type ContactFormData = z.infer<typeof contactSchema>;

const ContactPage = () => {
  const { t, isRTL, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: ContactFormData) => {
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        'https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/submit-contact-form',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            subject: data.subject,
            message: data.message
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setCooldownMinutes(15);
          return;
        }
        throw new Error(result.error || 'Failed to submit');
      }

      setIsSubmitted(true);
      reset();
      toast.success(t('contact.success'));
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error(t('contact.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      titleEn: 'Location',
      titleAr: 'الموقع',
      contentEn: 'Almufaijer Village, Al-Hariq Governorate, Riyadh Region, Saudi Arabia',
      contentAr: 'قرية المفيجر، محافظة الحريق، منطقة الرياض، المملكة العربية السعودية',
      dirType: 'auto' as const
    },
    {
      icon: Phone,
      titleEn: 'Phone',
      titleAr: 'الهاتف',
      contentEn: '+966 50 101 8811',
      contentAr: '+966 50 101 8811',
      dirType: 'ltr' as const
    },
    {
      icon: Mail,
      titleEn: 'Email',
      titleAr: 'البريد الإلكتروني',
      contentEn: 'info@almufaijer.com',
      contentAr: 'info@almufaijer.com',
      dirType: 'ltr' as const
    },
    {
      icon: Clock,
      titleEn: 'Operating Hours',
      titleAr: 'ساعات العمل',
      contentEn: 'Daily (Including Friday)\n3:00 PM - 12:00 AM',
      contentAr: 'يومياً (بما في ذلك الجمعة)\n٣:٠٠ م - ١٢:٠٠ ص',
      dirType: 'auto' as const
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%238B7355' fill-opacity='0.4'/%3E%3C/svg%3E")`,
              backgroundSize: '30px 30px'
            }}
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 max-w-5xl mx-auto">
            {contactInfo.map((info, index) => (
              <Card key={index} className="bg-card border-border/50">
                <CardContent className="p-3 lg:p-4 text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3">
                    <info.icon className="h-5 w-5 lg:h-6 lg:w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm lg:text-base mb-1">
                    {isArabic ? info.titleAr : info.titleEn}
                  </h3>
                  <p
                    dir={info.dirType}
                    className="text-xs lg:text-sm text-muted-foreground whitespace-pre-line"
                  >
                    {isArabic ? info.contentAr : info.contentEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                {t('contact.form.title')}
              </h2>
              <p className="text-muted-foreground">
                {isArabic
                  ? 'املأ النموذج أدناه وسنتواصل معك في أقرب وقت'
                  : 'Fill out the form below and we\'ll get back to you soon'}
              </p>
            </div>

            <Card className="bg-card border-border/50 shadow-xl">
              <CardContent className="p-5 sm:p-6 lg:p-8">
                {cooldownMinutes !== null ? (
                  <CooldownNotice remainingMinutes={cooldownMinutes} isArabic={isArabic} />
                ) : isSubmitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2 text-base">
                      {t('contact.form.successTitle')}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t('contact.form.successMessage')}
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline">
                      {t('contact.form.sendAnother')}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Honeypot */}
                    <input
                      type="text"
                      name="website"
                      autoComplete="off"
                      tabIndex={-1}
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="sr-only"
                      aria-hidden="true"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('contact.form.name')} *</Label>
                        <Input
                          id="name"
                          {...register('name')}
                          placeholder={t('contact.form.namePlaceholder')}
                          className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('contact.form.email')} *</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder={t('contact.form.emailPlaceholder')}
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...register('phone')}
                          placeholder="+966 5XX XXX XXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">{t('contact.form.subject')} *</Label>
                        <Input
                          id="subject"
                          {...register('subject')}
                          placeholder={t('contact.form.subjectPlaceholder')}
                          className={errors.subject ? 'border-destructive' : ''}
                        />
                        {errors.subject && (
                          <p className="text-sm text-destructive">{errors.subject.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t('contact.form.message')} *</Label>
                      <Textarea
                        id="message"
                        {...register('message')}
                        placeholder={t('contact.form.messagePlaceholder')}
                        rows={5}
                        className={errors.message ? 'border-destructive' : ''}
                      />
                      {errors.message && (
                        <p className="text-sm text-destructive">{errors.message.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="btn-gold w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        t('contact.form.sending')
                      ) : (
                        <>
                          <Send className="h-4 w-4 me-2" />
                          {t('contact.form.send')}
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="py-3 lg:py-4">
                <CardTitle className="text-base lg:text-lg text-center">
                  {t('contact.map.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.5!2d46.56436420764147!3d23.612384849872548!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM2JzQ0LjYiTiA0NsKwMzMnNTEuNyJF!5e0!3m2!1sen!2ssa!4v1"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '300px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={t('contact.map.title')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
