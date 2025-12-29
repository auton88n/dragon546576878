import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, ArrowUpRight } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const { t, currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/', label: isArabic ? 'الرئيسية' : 'Home' },
    { href: '/book', label: isArabic ? 'احجز تذكرتك' : 'Book Tickets' },
    { href: '/my-tickets', label: isArabic ? 'تذاكري' : 'My Tickets' },
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://www.facebook.com/', label: 'Facebook' },
    { icon: Instagram, href: 'https://www.instagram.com/', label: 'Instagram' },
    { icon: Youtube, href: 'https://www.youtube.com/', label: 'YouTube' },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Logo variant="light" />
            <p className="text-primary-foreground/70 leading-relaxed">
              {isArabic
                ? 'تجربة تراثية أصيلة في قلب المملكة العربية السعودية'
                : 'An authentic heritage experience in the heart of the Kingdom'}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-accent flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">
              {isArabic ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">
              {isArabic ? 'تواصل معنا' : 'Contact Us'}
            </h3>
            <div className="space-y-4">
              <a 
                href="mailto:info@almufaijer.com"
                className="flex items-center gap-3 text-primary-foreground/70 hover:text-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <span>info@almufaijer.com</span>
              </a>
              <a 
                href="tel:+966501018811"
                className="flex items-center gap-3 text-primary-foreground/70 hover:text-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <Phone className="h-4 w-4" />
                </div>
                <span dir="ltr">+966 50 101 8811</span>
              </a>
              <div className="flex items-start gap-3 text-primary-foreground/70">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>
                  {isArabic 
                    ? 'المفيجر 16561، المملكة العربية السعودية' 
                    : 'Almufaijer 16561, Saudi Arabia'}
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">
              {isArabic ? 'احجز زيارتك' : 'Book Your Visit'}
            </h3>
            <p className="text-primary-foreground/70">
              {isArabic
                ? 'انضم إلينا لتجربة لا تُنسى في سوق المفيجر التراثي'
                : 'Join us for an unforgettable experience at Souq Almufaijer'}
            </p>
            <Link to="/book">
              <Button className="w-full gradient-bg text-white border-0 glow-hover">
                {isArabic ? 'احجز الآن' : 'Book Now'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 text-center text-primary-foreground/50 text-sm">
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
