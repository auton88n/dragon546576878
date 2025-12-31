import logoLoading from '@/assets/logo-loading.png';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  text?: string;
}

const LoadingSpinner = ({ size = 'md', fullPage = false, text }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-24 w-auto',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <img
        src={logoLoading}
        alt=""
        className={`${sizeClasses[size]} animate-logo-breathe`}
        style={{ filter: 'drop-shadow(0 0 12px hsl(var(--heritage-gold) / 0.4))' }}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
