import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, UserCheck, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const bookingStatuses = [
  { status: 'confirmed', icon: CheckCircle, colorClass: 'text-emerald-600 bg-emerald-500/20', labelEn: 'Confirmed', labelAr: 'مؤكد' },
  { status: 'pending', icon: Clock, colorClass: 'text-amber-600 bg-amber-500/20', labelEn: 'Pending', labelAr: 'معلق' },
  { status: 'cancelled', icon: XCircle, colorClass: 'text-red-600 bg-red-500/20', labelEn: 'Cancelled', labelAr: 'ملغي' },
];

const ticketStatuses = [
  { status: 'confirmed', icon: CheckCircle, colorClass: 'text-emerald-600 bg-emerald-500/20', labelEn: 'Confirmed', labelAr: 'مؤكد' },
  { status: 'pending', icon: Clock, colorClass: 'text-amber-600 bg-amber-500/20', labelEn: 'Pending', labelAr: 'في الانتظار' },
  { status: 'checked_in', icon: UserCheck, colorClass: 'text-blue-600 bg-blue-500/20', labelEn: 'Checked In', labelAr: 'تم الدخول' },
  { status: 'used', icon: CheckCheck, colorClass: 'text-gray-600 bg-gray-500/20', labelEn: 'Used', labelAr: 'مستخدم' },
  { status: 'cancelled', icon: XCircle, colorClass: 'text-red-600 bg-red-500/20', labelEn: 'Cancelled', labelAr: 'ملغي' },
];

const StatusLegend = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'border-accent/30 hover:bg-accent/10 text-xs gap-1.5',
          isRTL && 'flex-row-reverse'
        )}
      >
        <Info className="h-3.5 w-3.5 text-accent" />
        {isArabic ? 'دليل الحالات' : 'Status Guide'}
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {isOpen && (
        <div 
          className={cn(
            'absolute top-full mt-2 z-50 glass-card rounded-xl border border-accent/20 p-4 shadow-lg min-w-[280px]',
            isRTL ? 'right-0' : 'left-0'
          )}
        >
          {/* Bookings Section */}
          <div className="mb-4">
            <h4 className={cn(
              'text-xs font-semibold text-muted-foreground uppercase mb-2',
              isRTL && 'text-end'
            )}>
              {isArabic ? 'حالات الحجز' : 'Booking Status'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {bookingStatuses.map(({ status, icon: Icon, colorClass, labelEn, labelAr }) => (
                <div
                  key={status}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                    colorClass,
                    isRTL && 'flex-row-reverse'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{isArabic ? labelAr : labelEn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets Section */}
          <div>
            <h4 className={cn(
              'text-xs font-semibold text-muted-foreground uppercase mb-2',
              isRTL && 'text-end'
            )}>
              {isArabic ? 'حالات التذكرة' : 'Ticket Status'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {ticketStatuses.map(({ status, icon: Icon, colorClass, labelEn, labelAr }) => (
                <div
                  key={status}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                    colorClass,
                    isRTL && 'flex-row-reverse'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{isArabic ? labelAr : labelEn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusLegend;
