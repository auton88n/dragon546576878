import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Phone, Mail } from 'lucide-react';
import Logo from './Logo';
import PoweredByAYN from './PoweredByAYN';

const Footer = () => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/', label: isArabic ? 'الرئيسية' : 'Home' },
    { href: '/about', label: isArabic ? 'من نحن' : 'About Us' },
    { href: '/book', label: isArabic ? 'احجز تذكرتك' : 'Book Tickets' },
    { href: '/my-tickets', label: isArabic ? 'تذاكري' : 'My Tickets' },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Logo variant="light" />
            <p className="text-background/70 text-sm max-w-sm">
              {isArabic
                ? 'تجربة تراثية أصيلة في قلب المملكة العربية السعودية'
                : 'An authentic heritage experience in the heart of Saudi Arabia'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-accent">
              {isArabic ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
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
              {isArabic ? 'تواصل معنا' : 'Contact Us'}
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
};

export default Footer;
