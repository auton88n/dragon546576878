import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
}

const Logo = ({ className = '', variant = 'default' }: LogoProps) => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
        variant === 'light' 
          ? 'bg-accent text-primary' 
          : 'gradient-bg text-white'
      }`}>
        م
      </div>
      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={`text-lg font-bold leading-tight ${
          variant === 'light' ? 'text-primary-foreground' : 'text-foreground'
        }`}>
          {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
        </span>
        <span className={`text-xs ${
          variant === 'light' ? 'text-primary-foreground/60' : 'text-muted-foreground'
        }`}>
          {isArabic ? 'استكشاف طويق' : 'Discover Tuwayq'}
        </span>
      </div>
    </Link>
  );
};

export default Logo;
