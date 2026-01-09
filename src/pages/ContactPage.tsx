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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OptimizedImage from '@/components/shared/OptimizedImage';
import CooldownNotice from '@/components/shared/CooldownNotice';
import { checkRateLimit, recordAttempt, RATE_LIMITS } from '@/lib/rateLimiter';
const heroImage = '/images/hero-contact.webp';
const contactSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  email: z.string().trim().email('Please enter a valid email').max(255),
  phone: z.string().optional(),
  subject: z.string().trim().min(3, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000)
});
type ContactFormData = z.infer<typeof contactSchema>;
const ContactPage = () => {
  const {
    t,
    isRTL,
    currentLanguage
  } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors
    }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });
  const onSubmit = async (data: ContactFormData) => {
    // Honeypot check - silently "succeed" for bots
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(RATE_LIMITS.CONTACT_FORM);
    if (!rateLimitResult.allowed) {
      setCooldownMinutes(rateLimitResult.remainingMinutes || 1);
      return;
    }
    setIsSubmitting(true);
    try {
      // Record the attempt before submission
      recordAttempt(RATE_LIMITS.CONTACT_FORM.key);
      const {
        error
      } = await supabase.from('contact_submissions').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message
      });
      if (error) throw error;
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
  const contactInfo = [{
    icon: MapPin,
    titleEn: 'Location',
    titleAr: 'الموقع',
    contentEn: 'Almufaijer Village, Al-Hariq Governorate, Riyadh Region, Saudi Arabia',
    contentAr: 'قرية المفيجر، محافظة الحريق، منطقة الرياض، المملكة العربية السعودية',
    dirType: 'auto' as const
  }, {
    icon: Phone,
    titleEn: 'Phone',
    titleAr: 'الهاتف',
    contentEn: '+966 50 101 8811',
    contentAr: '+966 50 101 8811',
    dirType: 'ltr' as const
  }, {
    icon: Mail,
    titleEn: 'Email',
    titleAr: 'البريد الإلكتروني',
    contentEn: 'info@almufaijer.com',
    contentAr: 'info@almufaijer.com',
    dirType: 'ltr' as const
  }, {
    icon: Clock,
    titleEn: 'Operating Hours',
    titleAr: 'ساعات العمل',
    contentEn: 'Daily (Including Friday)\n3:00 PM - 12:00 AM',
    contentAr: 'يومياً (بما في ذلك الجمعة)\n٣:٠٠ م - ١٢:٠٠ ص',
    dirType: 'auto' as const
  }];
  return <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative z-0 h-[40vh] min-h-[280px] max-h-[400px] overflow-hidden">
        <OptimizedImage src={heroImage} alt="Souq Almufaijer" className="absolute inset-0 w-full h-full object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        
        {/* Hero Content - positioned at bottom */}
        <div className="absolute inset-0 flex items-end justify-center pb-8 md:pb-10">
          <div className="text-center px-4">
            <div className="inline-block backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-8 py-6 shadow-2xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                {t('contact.title')}
              </h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto">
                {t('contact.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {t('contact.form.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cooldownMinutes !== null ? <CooldownNotice remainingMinutes={cooldownMinutes} isArabic={isArabic} /> : isSubmitted ? <div className="text-center py-12">
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
                  </div> : <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Honeypot - invisible to humans */}
                    <input type="text" name="website" autoComplete="off" tabIndex={-1} value={honeypot} onChange={e => setHoneypot(e.target.value)} className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true" />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('contact.form.name')} *</Label>
                        <Input id="name" {...register('name')} placeholder={t('contact.form.namePlaceholder')} className={errors.name ? 'border-destructive' : ''} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('contact.form.email')} *</Label>
                        <Input id="email" type="email" {...register('email')} placeholder={t('contact.form.emailPlaceholder')} className={errors.email ? 'border-destructive' : ''} />
                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                        <Input id="phone" type="tel" {...register('phone')} placeholder="+966 5XX XXX XXXX" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">{t('contact.form.subject')} *</Label>
                        <Input id="subject" {...register('subject')} placeholder={t('contact.form.subjectPlaceholder')} className={errors.subject ? 'border-destructive' : ''} />
                        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t('contact.form.message')} *</Label>
                      <Textarea id="message" {...register('message')} placeholder={t('contact.form.messagePlaceholder')} rows={5} className={errors.message ? 'border-destructive' : ''} />
                      {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                    </div>

                    <Button type="submit" className="btn-gold w-full" disabled={isSubmitting}>
                      {isSubmitting ? t('contact.form.sending') : <>
                          <Send className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          {t('contact.form.send')}
                        </>}
                    </Button>

                    
                  </form>}
              </CardContent>
            </Card>

            {/* Contact Information & Map */}
            <div className="space-y-8">
              {/* Contact Cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {contactInfo.map((info, index) => <Card key={index} className="border-border/50">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <info.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {currentLanguage === 'ar' ? info.titleAr : info.titleEn}
                        </h3>
                        <p dir={info.dirType} className="text-sm text-muted-foreground whitespace-pre-line mx-[22px]">
                          {currentLanguage === 'ar' ? info.contentAr : info.contentEn}
                        </p>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>

              {/* Map Placeholder */}
              <Card className="border-border/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">{t('contact.map.title')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.5!2d46.56436420764147!3d23.612384849872548!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM2JzQ0LjYiTiA0NsKwMzMnNTEuNyJF!5e0!3m2!1sen!2ssa!4v1" width="100%" height="100%" style={{
                    border: 0,
                    minHeight: '300px'
                  }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={t('contact.map.title')} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default ContactPage;