import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Phone, Mail } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/', label: isArabic ? 'الرئيسية' : 'Home' },
    { href: '/book', label: isArabic ? 'احجز تذكرتك' : 'Book Tickets' },
    { href: '/my-tickets', label: isArabic ? 'تذاكري' : 'My Tickets' },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo variant="light" />
            <p className="text-primary-foreground/70 text-sm">
              {isArabic
                ? 'تجربة تراثية أصيلة في قلب المملكة'
                : 'An authentic heritage experience in the heart of the Kingdom'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {isArabic ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {isArabic ? 'تواصل معنا' : 'Contact Us'}
            </h3>
            <div className="space-y-3 text-sm">
              <a 
                href="mailto:info@almufaijer.com"
                className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>info@almufaijer.com</span>
              </a>
              <a 
                href="tel:+966501018811"
                className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span dir="ltr">+966 50 101 8811</span>
              </a>
              <div className="flex items-start gap-2 text-primary-foreground/70">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
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
        <div className="mt-10 pt-6 border-t border-primary-foreground/10 text-center text-primary-foreground/50 text-sm">
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
