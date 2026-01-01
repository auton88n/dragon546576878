import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface ScanningTipsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultExpanded?: boolean;
}

const ScanningTips = React.forwardRef<HTMLDivElement, ScanningTipsProps>(
  ({ className, defaultExpanded = false, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { currentLanguage } = useLanguage();
    const isArabic = currentLanguage === 'ar';

    const tips = isArabic ? [
      'ارفع سطوع الشاشة للحد الأقصى',
      'امسك الهاتف بشكل مسطح',
      'تجنب ضوء الشمس المباشر',
      'نظّف الشاشة',
    ] : [
      'Maximize screen brightness',
      'Hold phone flat (reduce glare)',
      'Avoid direct sunlight',
      'Clean your screen',
    ];

    return (
      <div 
        ref={ref}
        className={cn('rounded-xl border border-accent/20 bg-accent/5 overflow-hidden', className)}
        {...props}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 p-3 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          aria-expanded={isExpanded}
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            {isArabic ? 'نصائح للمسح السريع' : 'Quick Scanning Tips'}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-3 pt-1">
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);
ScanningTips.displayName = 'ScanningTips';

export default ScanningTips;
