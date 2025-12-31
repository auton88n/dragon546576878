import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Ticket } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const hasHeroSection = location.pathname === '/' || location.pathname === '/about' || location.pathname === '/contact';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/about', label: t('nav.about') },
    { href: '/contact', label: t('nav.contact') },
    { href: '/book', label: t('nav.booking') },
    { href: '/my-tickets', label: t('nav.myTickets') },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Determine text colors based on scroll and page - ensure visibility on all backgrounds
  const getTextColor = (isActiveLink: boolean) => {
    if (isScrolled || !hasHeroSection) {
      // On solid white background - dark text, hover to darker
      return isActiveLink 
        ? 'text-accent font-semibold' 
        : 'text-foreground/80 hover:text-foreground';
    }
    // On transparent header (dark hero) - light text, hover to white
    return isActiveLink 
      ? 'text-white font-semibold drop-shadow-md' 
      : 'text-white/80 drop-shadow-md hover:text-white';
  };

  return (
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || !hasHeroSection
            ? 'bg-card backdrop-blur-xl border-b-2 border-border shadow-md' 
            : 'bg-gradient-to-b from-foreground/30 to-transparent'
        }`}
      >
      <div className="container flex h-16 md:h-20 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <Logo variant={isScrolled || !hasHeroSection ? 'default' : 'light'} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors ${getTextColor(isActive(link.href))}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/book">
            <Button className="btn-gold">
              <Ticket className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('nav.booking')}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher variant="minimal" />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isScrolled || !hasHeroSection 
                ? 'text-foreground hover:bg-muted' 
                : 'text-foreground drop-shadow-md hover:bg-foreground/10'
            }`}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-card/98 backdrop-blur-xl border-b border-border shadow-xl animate-fade-in">
          <nav className="container py-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`block py-3 px-4 rounded-xl text-base font-medium transition-colors ${
                  isActive(link.href) 
                    ? 'bg-accent/10 text-accent' 
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-border">
              <Link to="/book" onClick={() => setIsOpen(false)}>
                <Button className="btn-gold w-full">
                  <Ticket className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t('nav.booking')}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
