import { Check, Ticket, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const steps = [
    { number: 1, icon: Ticket, labelAr: 'اختر التذاكر والموعد', labelEn: 'Select Tickets & Date' },
    { number: 2, icon: CreditCard, labelAr: 'المعلومات والدفع', labelEn: 'Details & Payment' },
  ];

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-center gap-4">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm',
                    isCompleted && 'bg-accent text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground shadow-lg',
                    !isCompleted && !isActive && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <span 
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    isActive && 'text-foreground',
                    isCompleted && 'text-accent',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {isArabic ? step.labelAr : step.labelEn}
                </span>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-16 h-0.5 mx-4',
                  isCompleted ? 'bg-accent' : 'bg-border'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
