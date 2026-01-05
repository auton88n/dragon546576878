import { forwardRef } from 'react';

interface PoweredByAYNProps {
  className?: string;
}

const PoweredByAYN = forwardRef<HTMLDivElement, PoweredByAYNProps>(
  ({ className = '' }, ref) => {
    return (
      <div ref={ref} className={`text-center py-3 ${className}`}>
        <a 
          href="https://aynn.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[11px] text-[#8B7355] hover:text-[#6B5545] transition-colors"
        >
          Powered by <span className="font-semibold">AYN</span>
        </a>
      </div>
    );
  }
);

PoweredByAYN.displayName = 'PoweredByAYN';

export default PoweredByAYN;
