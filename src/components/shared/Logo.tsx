import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', variant = 'default', size = 'md' }: LogoProps) => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <Link to="/" className={`flex items-center gap-3 group ${className}`}>
      {/* Circular Arabic Logo */}
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 group-hover:scale-105 ${
          variant === 'light' 
            ? 'border-white/40' 
            : 'border-primary/30'
        }`} />
        
        {/* Inner circle with Arabic text */}
        <div className={`absolute inset-1 rounded-full flex items-center justify-center transition-all duration-300 ${
          variant === 'light'
            ? 'bg-white/10 backdrop-blur-sm'
            : 'bg-secondary/50'
        }`}>
          <span className={`font-arabic font-bold leading-none ${
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
          } ${
            variant === 'light' ? 'text-white' : 'text-primary'
          }`}>
            سم
          </span>
        </div>
      </div>

      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-bold leading-tight transition-colors ${
          variant === 'light' ? 'text-white' : 'text-foreground'
        }`}>
          {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
        </span>
        <span className={`text-xs transition-colors ${
          variant === 'light' ? 'text-white/70' : 'text-muted-foreground'
        }`}>
          {isArabic ? 'تجربة تراثية فريدة' : 'Heritage Experience'}
        </span>
      </div>
    </Link>
  );
};

export default Logo;