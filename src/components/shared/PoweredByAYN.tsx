import { forwardRef } from 'react';

interface PoweredByAYNProps {
  className?: string;
}

const PoweredByAYN = forwardRef<HTMLDivElement, PoweredByAYNProps>(
  ({ className = '' }, ref) => {
    return (
      <div ref={ref} className={`text-center py-3 ${className}`}>
        <span className="text-[11px] text-[#8B7355]">
          Powered by <span className="font-semibold">AYN</span>
        </span>
      </div>
    );
  }
);

PoweredByAYN.displayName = 'PoweredByAYN';

export default PoweredByAYN;
