import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher = ({ className = '' }: LanguageSwitcherProps) => {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-0.5 p-0.5 rounded-full bg-foreground/5 backdrop-blur-sm ${className}`}>
      <button
        onClick={() => setLanguage('ar')}
        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
          currentLanguage === 'ar'
            ? 'bg-primary text-primary-foreground shadow-sm'
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
            ? 'bg-primary text-primary-foreground shadow-sm'
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
