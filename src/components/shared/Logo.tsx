import { Link } from 'react-router-dom';
import logoBlack from '@/assets/logo-black.png';
import logoWhite from '@/assets/logo-white.png';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className = '', variant = 'default', size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  const logoSrc = variant === 'light' ? logoWhite : logoBlack;

  return (
    <Link to="/" className={`flex items-center group ${className}`}>
      <img 
        src={logoSrc} 
        alt="Souq Almufaijer" 
        className={`${sizeClasses[size]} w-auto transition-transform duration-300 group-hover:scale-105`}
      />
    </Link>
  );
};

export default Logo;
