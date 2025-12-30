import { Check, Ticket, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const { currentLanguage } = useLanguage();
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
                {/* Step Circle with Heritage Styling */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 font-semibold text-sm border-2',
                    isCompleted && 'gradient-gold border-accent text-foreground glow-gold',
                    isActive && 'gradient-gold border-accent text-foreground shadow-xl glow-gold scale-110',
                    !isCompleted && !isActive && 'bg-secondary border-border text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                
                {/* Step Label */}
                <span 
                  className={cn(
                    'text-sm font-medium hidden sm:block transition-colors',
                    isActive && 'text-accent font-semibold',
                    isCompleted && 'text-accent',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {isArabic ? step.labelAr : step.labelEn}
                </span>
              </div>
              
              {/* Connector line with animation */}
              {index < steps.length - 1 && (
                <div className="relative w-20 h-1 mx-4 bg-border rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'absolute inset-y-0 left-0 gradient-gold rounded-full transition-all duration-700 ease-out',
                      isCompleted ? 'w-full' : 'w-0'
                    )} 
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;