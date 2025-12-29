import { useLanguage } from '@/hooks/useLanguage';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  text?: string;
}

const LoadingSpinner = ({ size = 'md', fullPage = false, text }: LoadingSpinnerProps) => {
  const { currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';

  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-full border-primary/30 border-t-primary animate-spin`}
      />
      {text && (
        <p className="text-sm text-muted-foreground">
          {text}
        </p>
      )}
      {!text && fullPage && (
        <p className="text-sm text-muted-foreground">
          {isArabic ? 'جاري التحميل...' : 'Loading...'}
        </p>
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
