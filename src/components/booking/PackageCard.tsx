import { Check, Users, Baby } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export interface Package {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  adults: number;
  children: number;
  price: number;
  badge?: 'popular' | 'value';
  image: string;
}

interface PackageCardProps {
  package_: Package;
  isSelected: boolean;
  onSelect: () => void;
}

const PackageCard = ({ package_, isSelected, onSelect }: PackageCardProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const getBadgeText = () => {
    if (package_.badge === 'popular') return isArabic ? 'الأكثر طلباً' : 'Most Popular';
    if (package_.badge === 'value') return isArabic ? 'أفضل قيمة' : 'Best Value';
    return null;
  };

  const badgeText = getBadgeText();

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full p-5 rounded-2xl border-2 transition-all duration-300 text-start',
        'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent/50',
        isSelected
          ? 'border-accent bg-accent/10 shadow-md ring-2 ring-accent/30'
          : 'border-border bg-card hover:border-accent/50'
      )}
    >
      {/* Badge */}
      {badgeText && (
        <div className={cn(
          'absolute -top-3 px-3 py-1 rounded-full text-xs font-bold',
          package_.badge === 'popular' 
            ? 'bg-accent text-accent-foreground' 
            : 'bg-primary text-primary-foreground',
          isArabic ? 'right-4' : 'left-4'
        )}>
          {badgeText}
        </div>
      )}

      {/* Selection Indicator */}
      <div className={cn(
        'absolute top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
        isSelected 
          ? 'bg-accent border-accent' 
          : 'border-muted-foreground/30 bg-background',
        isArabic ? 'left-4' : 'right-4'
      )}>
        {isSelected && <Check className="h-4 w-4 text-accent-foreground" />}
      </div>

      {/* Package Image */}
      <div className={cn(
        'w-20 h-20 rounded-xl overflow-hidden mb-4 transition-all',
        isSelected ? 'ring-2 ring-accent glow-gold' : ''
      )}>
        <img 
          src={package_.image} 
          alt={isArabic ? package_.nameAr : package_.nameEn}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Package Name */}
      <h4 className="font-bold text-lg text-foreground mb-1">
        {isArabic ? package_.nameAr : package_.nameEn}
      </h4>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">
        {isArabic ? package_.descriptionAr : package_.descriptionEn}
      </p>

      {/* Inclusions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {package_.adults > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg text-xs">
            <Users className="h-3 w-3" />
            {package_.adults} {isArabic ? 'بالغ' : package_.adults === 1 ? 'Adult' : 'Adults'}
          </span>
        )}
        {package_.children > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg text-xs">
            <Baby className="h-3 w-3" />
            {package_.children} {isArabic ? 'طفل' : package_.children === 1 ? 'Child' : 'Children'}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-2xl font-bold',
          isSelected ? 'gradient-text-gold' : 'text-foreground'
        )}>
          {package_.price}
        </span>
        <span className="text-sm text-muted-foreground">
          {isArabic ? 'ر.س' : 'SAR'}
        </span>
      </div>
    </button>
  );
};

export default PackageCard;
