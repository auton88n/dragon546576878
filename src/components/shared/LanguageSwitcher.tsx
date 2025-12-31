import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal';
  className?: string;
}

const LanguageSwitcher = ({ variant = 'default', className = '' }: LanguageSwitcherProps) => {
  const { currentLanguage: language, toggleLanguage } = useLanguage();

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleLanguage}
        className={`text-sm font-medium hover:text-primary transition-colors ${className}`}
        aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {language === 'ar' ? 'EN' : 'عربي'}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`gap-2 rounded-full border-foreground/15 hover:bg-foreground/5 hover:border-foreground/25 shadow-sm ${className}`}
      aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe className="h-4 w-4" />
      <span>{language === 'ar' ? 'English' : 'عربي'}</span>
    </Button>
  );
};

export default LanguageSwitcher;
