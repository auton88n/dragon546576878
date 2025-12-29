import { Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const { t, isRTL } = useLanguage();

  const steps = [
    { number: 1, labelKey: 'booking.steps.tickets' },
    { number: 2, labelKey: 'booking.steps.datetime' },
    { number: 3, labelKey: 'booking.steps.info' },
    { number: 4, labelKey: 'booking.steps.payment' },
  ];

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${((currentStep - 1) / 3) * 100}%`,
            [isRTL ? 'right' : 'left']: 0 
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isInactive = step.number > currentStep;

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  'step-indicator transition-all duration-300',
                  isCompleted && 'completed',
                  isActive && 'active ring-4 ring-primary/20',
                  isInactive && 'inactive'
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
                  'mt-3 text-sm font-medium transition-colors text-center max-w-[80px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
