import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSwitcherProps {
  variant?: 'default' | 'light';
  className?: string;
}

const LanguageSwitcher = ({ variant = 'default', className = '' }: LanguageSwitcherProps) => {
  const { currentLanguage, setLanguage } = useLanguage();

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-0.5 p-0.5 rounded-full backdrop-blur-sm transition-colors duration-300 ${
      isLight ? 'bg-white/15' : 'bg-foreground/5'
    } ${className}`}>
      <button
        onClick={() => setLanguage('ar')}
        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
          currentLanguage === 'ar'
            ? isLight 
              ? 'bg-white text-foreground shadow-sm' 
              : 'bg-primary text-primary-foreground shadow-sm'
            : isLight 
              ? 'text-white/70 hover:text-white' 
              : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="التبديل إلى العربية"
      >
        AR
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
          currentLanguage === 'en'
            ? isLight 
              ? 'bg-white text-foreground shadow-sm' 
              : 'bg-primary text-primary-foreground shadow-sm'
            : isLight 
              ? 'text-white/70 hover:text-white' 
              : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
