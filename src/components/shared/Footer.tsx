import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Phone, Mail, Navigation } from 'lucide-react';
import Logo from './Logo';
import PoweredByAYN from './PoweredByAYN';

const Footer = forwardRef<HTMLElement, object>((_, ref) => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const currentYear = new Date().getFullYear();

  const exploreLinks = [
    { href: '/', label: isArabic ? 'الرئيسية' : 'Home' },
    { href: '/about', label: isArabic ? 'من نحن' : 'About Us' },
    { href: '/book', label: isArabic ? 'احجز تذكرتك' : 'Book Tickets' },
    { href: '/my-tickets', label: isArabic ? 'تذاكري' : 'My Tickets' },
  ];

  const helpLinks = [
    { href: '/support', label: isArabic ? 'المساعدة والدعم' : 'Help & Support' },
    { href: '/terms', label: isArabic ? 'سياسة الاستبدال' : 'Exchange Policy' },
    { href: '/group-bookings', label: isArabic ? 'حجوزات الشركات' : 'Corporate Bookings' },
    { href: '/contact', label: isArabic ? 'اتصل بنا' : 'Contact Us' },
  ];

  return (
    <footer ref={ref} className="bg-foreground text-background">
      <div className="container py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Logo variant="light" />
            <p className="text-background/70 text-sm max-w-sm">
              {isArabic
                ? 'تجربة تراثية أصيلة في قلب المملكة العربية السعودية'
                : 'An authentic heritage experience in the heart of Saudi Arabia'}
            </p>
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-accent">
              {isArabic ? 'استكشف' : 'Explore'}
            </h3>
            <ul className="space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-accent text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help & Policies */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-accent">
              {isArabic ? 'المساعدة والسياسات' : 'Help & Policies'}
            </h3>
            <ul className="space-y-3">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-accent text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-accent">
              {isArabic ? 'تواصل معنا' : 'Contact'}
            </h3>
            <div className="space-y-3 text-sm">
              <a 
                href="mailto:info@almufaijer.com"
                className="flex items-center gap-3 text-background/70 hover:text-accent transition-colors"
              >
                <Mail className="h-5 w-5 flex-shrink-0" />
                <span>info@almufaijer.com</span>
              </a>
              <a 
                href="tel:+966501018811"
                className="flex items-center gap-3 text-background/70 hover:text-accent transition-colors"
              >
                <Phone className="h-5 w-5 flex-shrink-0" />
                <span dir="ltr">+966 50 101 8811</span>
              </a>
              <div className="flex items-start gap-3 text-background/70">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  {isArabic 
                    ? 'المفيجر، المملكة العربية السعودية' 
                    : 'Almufaijer, Saudi Arabia'}
                </span>
              </div>
              <a 
                href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-background/70 hover:text-accent transition-colors"
              >
                <Navigation className="h-5 w-5 flex-shrink-0" />
                <span>{isArabic ? 'احصل على الاتجاهات' : 'Get Directions'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-background/10 text-center text-background/50 text-sm">
          <p>
            {isArabic
              ? `© ${currentYear} سوق المفيجر. جميع الحقوق محفوظة.`
              : `© ${currentYear} Souq Almufaijer. All rights reserved.`}
          </p>
          <Link 
            to="/login" 
            className="inline-block mt-3 text-background/40 hover:text-accent text-xs transition-colors"
          >
            {isArabic ? 'بوابة الموظفين' : 'Staff Portal'}
          </Link>
          {/* Powered by AYN AI */}
          <PoweredByAYN className="mt-4" />
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
export default Footer;
