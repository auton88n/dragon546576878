import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
}

const Logo = ({ className = '', showTagline = false }: LogoProps) => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <Link to="/" className={`flex flex-col ${className}`}>
      <span className="text-xl md:text-2xl font-bold text-primary font-cairo">
        {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
      </span>
      {showTagline && (
        <span className="text-xs text-muted-foreground">
          {isArabic ? 'تراث السعودية' : 'Saudi Heritage'}
        </span>
      )}
    </Link>
  );
};

export default Logo;
