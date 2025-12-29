import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const { t, currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const currentYear = new Date().getFullYear();

  const operatingHours = [
    { day: isArabic ? 'السبت - الخميس' : 'Saturday - Thursday', hours: isArabic ? '٩:٠٠ ص - ٦:٠٠ م' : '9:00 AM - 6:00 PM' },
    { day: isArabic ? 'الجمعة' : 'Friday', hours: isArabic ? 'مغلق' : 'Closed' },
  ];

  return (
    <footer className="bg-accent text-accent-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Logo className="text-accent-foreground [&>span]:text-accent-foreground" />
            <p className="text-sm text-accent-foreground/80">
              {isArabic
                ? 'اكتشف جمال التراث السعودي الأصيل في سوق المفيجر التاريخي'
                : 'Discover the beauty of authentic Saudi heritage at historic Souq Almufaijer'}
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {isArabic ? 'تواصل معنا' : 'Contact Us'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{isArabic ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0" />
                <span dir="ltr">+966 11 XXX XXXX</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0" />
                <span>info@almufaijer.com</span>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {isArabic ? 'ساعات العمل' : 'Operating Hours'}
            </h3>
            <div className="space-y-2 text-sm">
              {operatingHours.map((item, index) => (
                <div key={index} className="flex justify-between gap-4">
                  <span>{item.day}</span>
                  <span className="text-accent-foreground/80">{item.hours}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {isArabic ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <div className="space-y-2 text-sm">
              <a href="/book" className="block hover:text-primary transition-colors">
                {t('nav.bookTickets')}
              </a>
              <a href="/my-tickets" className="block hover:text-primary transition-colors">
                {t('nav.myTickets')}
              </a>
              <a href="/login" className="block hover:text-primary transition-colors">
                {t('nav.staffLogin')}
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-accent-foreground/20 text-center text-sm text-accent-foreground/60">
          <p>
            {isArabic
              ? `© ${currentYear} سوق المفيجر. جميع الحقوق محفوظة.`
              : `© ${currentYear} Souq Almufaijer. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
