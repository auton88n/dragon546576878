import { CheckCircle, Clock, XCircle, UserCheck, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

type BookingStatus = 'confirmed' | 'pending' | 'cancelled';
type TicketStatus = 'confirmed' | 'pending' | 'checked_in' | 'used' | 'cancelled';

interface StatusBadgeProps {
  type: 'booking' | 'ticket';
  status: BookingStatus | TicketStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle,
    colorClass: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
    labelEn: 'Confirmed',
    labelAr: 'مؤكد',
  },
  pending: {
    icon: Clock,
    colorClass: 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-400',
    labelEn: 'Pending',
    labelAr: 'في الانتظار',
  },
  cancelled: {
    icon: XCircle,
    colorClass: 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400',
    labelEn: 'Cancelled',
    labelAr: 'ملغي',
  },
  checked_in: {
    icon: UserCheck,
    colorClass: 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400',
    labelEn: 'Checked In',
    labelAr: 'تم الدخول',
  },
  used: {
    icon: CheckCheck,
    colorClass: 'bg-gray-500/20 text-gray-600 border-gray-500/30 dark:text-gray-400',
    labelEn: 'Used',
    labelAr: 'مستخدم',
  },
};

const sizeConfig = {
  sm: { badge: 'text-xs px-2 py-0.5', icon: 'h-3 w-3' },
  md: { badge: 'text-sm px-2.5 py-1', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-base px-3 py-1.5', icon: 'h-4 w-4' },
};

export const StatusBadge = ({ 
  type, 
  status, 
  size = 'md', 
  showIcon = true,
  className 
}: StatusBadgeProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }
  
  const Icon = config.icon;
  const sizes = sizeConfig[size];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.colorClass, 
        sizes.badge,
        'flex items-center gap-1.5 font-medium',
        isArabic && 'flex-row-reverse',
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      <span>{isArabic ? config.labelAr : config.labelEn}</span>
    </Badge>
  );
};

// Helper function to derive ticket status from booking and ticket data
export const getTicketStatus = (
  ticket: { is_used?: boolean | null },
  booking: { booking_status: string; payment_status: string }
): TicketStatus => {
  if (booking.booking_status === 'cancelled') return 'cancelled';
  if (ticket.is_used) return 'used';
  if (booking.payment_status === 'pending') return 'pending';
  return 'confirmed';
};

export default StatusBadge;
