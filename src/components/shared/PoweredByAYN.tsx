import { useLanguage } from '@/hooks/useLanguage';

interface PoweredByAYNProps {
  className?: string;
}

const PoweredByAYN = ({ className = '' }: PoweredByAYNProps) => {
  return (
    <div className={`text-center py-3 ${className}`}>
      <a
        href="https://ayn-ai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-[#8B7355] hover:text-accent transition-colors"
      >
        Powered by <span className="font-semibold">AYN AI</span>
      </a>
    </div>
  );
};

export default PoweredByAYN;
