import { useLanguage } from '@/hooks/useLanguage';

interface PoweredByAYNProps {
  className?: string;
}

const PoweredByAYN = ({ className = '' }: PoweredByAYNProps) => {
  return (
    <div className={`text-center py-3 ${className}`}>
      <span className="text-[11px] text-[#8B7355]">
        Powered by <span className="font-semibold">AYN</span>
      </span>
    </div>
  );
};

export default PoweredByAYN;
