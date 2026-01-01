import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, ChevronDown, ExternalLink } from 'lucide-react';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OptimizedImage from '@/components/shared/OptimizedImage';
import heroImage from '@/assets/hero-heritage.webp';
import heroImageFallback from '@/assets/hero-heritage.jpg';

const contactSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  email: z.string().trim().email('Please enter a valid email').max(255),
  phone: z.string().optional(),
  subject: z.string().trim().min(3, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const ContactPage = () => {
  const { t, isRTL, currentLanguage } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
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

  const contactInfo = [
    {
      icon: MapPin,
      titleEn: 'Location',
      titleAr: 'الموقع',
      contentEn: 'Almufaijer Village, Saudi Arabia',
      contentAr: 'قرية المفيجر، المملكة العربية السعودية',
      link: 'https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8',
    },
    {
      icon: Phone,
      titleEn: 'Phone',
      titleAr: 'الهاتف',
      contentEn: '+966 50 101 8811',
      contentAr: '+966 50 101 8811',
      link: 'tel:+966501018811',
    },
    {
      icon: Mail,
      titleEn: 'Email',
      titleAr: 'البريد الإلكتروني',
      contentEn: 'info@almufaijer.com',
      contentAr: 'info@almufaijer.com',
      link: 'mailto:info@almufaijer.com',
    },
    {
      icon: Clock,
      titleEn: 'Working Hours',
      titleAr: 'ساعات العمل',
      contentEn: 'Sat - Thu: 9AM - 6PM',
      contentAr: 'السبت - الخميس: ٩ص - ٦م',
    },
  ];

  const scrollToContent = () => {
    document.getElementById('contact-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] flex items-end justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <OptimizedImage
            src={heroImage}
            alt="Almufaijer Heritage"
            className="w-full h-full object-cover"
            priority
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center pb-16 md:pb-20 px-4">
          <div className="glass-card-gold inline-block px-8 py-6 md:px-12 md:py-8">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">
              {t('contact.title')}
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-lg mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <button
          onClick={scrollToContent}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce"
          aria-label="Scroll to content"
        >
          <ChevronDown className="w-8 h-8 text-white/80 hover:text-white transition-colors" />
        </button>

        {/* Bottom fade to content */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Main Content */}
      <section id="contact-content" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          {/* Contact Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
            {contactInfo.map((info, index) => {
              const CardWrapper = info.link ? 'a' : 'div';
              const linkProps = info.link
                ? {
                    href: info.link,
                    target: info.link.startsWith('http') ? '_blank' : undefined,
                    rel: info.link.startsWith('http') ? 'noopener noreferrer' : undefined,
                  }
                : {};

              return (
                <CardWrapper
                  key={index}
                  {...linkProps}
                  className={`glass-card group p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    info.link ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <info.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {currentLanguage === 'ar' ? info.titleAr : info.titleEn}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {currentLanguage === 'ar' ? info.contentAr : info.contentEn}
                  </p>
                  {info.link?.startsWith('http') && (
                    <ExternalLink className="w-4 h-4 mx-auto mt-3 text-primary/60 group-hover:text-primary transition-colors" />
                  )}
                </CardWrapper>
              );
            })}
          </div>

          {/* Form and Map Grid */}
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
            {/* Contact Form */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
                {t('contact.form.title')}
              </h2>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('contact.form.name')} *</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder={t('contact.form.namePlaceholder')}
                        className={`bg-background/50 ${errors.name ? 'border-destructive' : ''}`}
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
                        className={`bg-background/50 ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        placeholder="+966 5XX XXX XXXX"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t('contact.form.subject')} *</Label>
                      <Input
                        id="subject"
                        {...register('subject')}
                        placeholder={t('contact.form.subjectPlaceholder')}
                        className={`bg-background/50 ${errors.subject ? 'border-destructive' : ''}`}
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
                      className={`bg-background/50 resize-none ${errors.message ? 'border-destructive' : ''}`}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="btn-gold w-full"
                    disabled={isSubmitting}
                  >
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
            </div>

            {/* Map Section */}
            <div className="glass-card p-4 md:p-6 flex flex-col">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                {t('contact.map.title')}
              </h2>
              <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-border/50">
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
              <a
                href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4"
              >
                <Button variant="outline" className="w-full group">
                  <MapPin className="w-4 h-4 me-2" />
                  {currentLanguage === 'ar' ? 'احصل على الاتجاهات' : 'Get Directions'}
                  <ExternalLink className="w-4 h-4 ms-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
