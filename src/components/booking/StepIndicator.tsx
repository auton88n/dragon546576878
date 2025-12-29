import { Check, Ticket, CalendarDays, User, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const steps = [
    { number: 1, icon: Ticket, labelAr: 'التذاكر', labelEn: 'Tickets' },
    { number: 2, icon: CalendarDays, labelAr: 'الموعد', labelEn: 'Date & Time' },
    { number: 3, icon: User, labelAr: 'المعلومات', labelEn: 'Details' },
    { number: 4, icon: CreditCard, labelAr: 'الدفع', labelEn: 'Payment' },
  ];

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-6 left-[10%] right-[10%] h-1 bg-border rounded-full" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-6 h-1 gradient-bg rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentStep - 1) / 3) * 80}%`,
            [isRTL ? 'right' : 'left']: '10%'
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 font-semibold',
                  isCompleted && 'gradient-bg text-white shadow-lg',
                  isActive && 'gradient-bg text-white shadow-lg glow animate-pulse-glow',
                  !isCompleted && !isActive && 'bg-secondary text-muted-foreground border-2 border-border'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span 
                className={cn(
                  'mt-3 text-sm font-medium transition-colors text-center',
                  isActive && 'text-accent',
                  isCompleted && 'text-foreground',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                {isArabic ? step.labelAr : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
