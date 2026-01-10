import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

interface PaymentStatusBadgeProps {
  status: 'pending' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const PaymentStatusBadge = ({ status, size = 'md', showIcon = true }: PaymentStatusBadgeProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const config = {
    pending: {
      label: isArabic ? 'في انتظار الدفع' : 'Awaiting Payment',
      shortLabel: isArabic ? 'معلق' : 'Pending',
      className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
      icon: Clock,
    },
    completed: {
      label: isArabic ? 'تم الدفع' : 'Paid',
      shortLabel: isArabic ? 'مدفوع' : 'Paid',
      className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
      icon: CheckCircle,
    },
    failed: {
      label: isArabic ? 'فشل الدفع' : 'Payment Failed',
      shortLabel: isArabic ? 'فشل' : 'Failed',
      className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
      icon: XCircle,
    },
  };

  const { label, shortLabel, className, icon: Icon } = config[status];
  
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 h-auto whitespace-nowrap',
    md: 'text-sm px-3.5 py-1.5 h-auto whitespace-nowrap',
    lg: 'text-base px-5 py-2 h-auto whitespace-nowrap',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      variant="outline" 
      className={`${className} ${sizeClasses[size]} font-medium border`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${isArabic ? 'ml-1.5' : 'mr-1.5'}`} />}
      {size === 'sm' ? shortLabel : label}
    </Badge>
  );
};

export default PaymentStatusBadge;
