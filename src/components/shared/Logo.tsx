import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import logoBlack from '@/assets/logo-black.png';
import logoWhite from '@/assets/logo-white.png';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

const Logo = forwardRef<HTMLAnchorElement, LogoProps>(
  ({ className = '', variant = 'default', size = 'md' }, ref) => {
    const sizeClasses = {
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-14',
    };

    const logoSrc = variant === 'light' ? logoWhite : logoBlack;

    return (
      <Link ref={ref} to="/" className={`flex items-center group ${className}`}>
        <img 
          src={logoSrc} 
          alt="Souq Almufaijer" 
          className={`${sizeClasses[size]} w-auto transition-transform duration-300 group-hover:scale-105`}
        />
      </Link>
    );
  }
);

Logo.displayName = 'Logo';

export default Logo;
