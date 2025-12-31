import { Users, Baby, Minus, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
}

interface PackageCardProps {
  package_: Package;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const PackageCard = ({ package_, quantity, onQuantityChange }: PackageCardProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const isSelected = quantity > 0;

  const getBadgeText = () => {
    if (package_.badge === 'popular') return isArabic ? 'الأكثر طلباً' : 'Most Popular';
    if (package_.badge === 'value') return isArabic ? 'أفضل قيمة' : 'Best Value';
    return null;
  };

  const badgeText = getBadgeText();

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 0) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < 10) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div
      className={cn(
        'relative w-full p-5 rounded-2xl border-2 transition-all duration-300 text-start',
        isSelected
          ? 'border-accent bg-accent/10 shadow-md ring-2 ring-accent/30'
          : 'border-border bg-card hover:border-accent/50 hover:shadow-lg'
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

      {/* Price and Quantity */}
      <div className="flex items-center justify-between">
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

        {/* Quantity Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-full transition-all',
              quantity === 0 ? 'opacity-50' : 'hover:bg-accent hover:text-accent-foreground'
            )}
            onClick={handleDecrease}
            disabled={quantity === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className={cn(
            'w-8 text-center font-bold text-lg',
            isSelected ? 'text-accent' : 'text-foreground'
          )}>
            {quantity}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-full transition-all hover:bg-accent hover:text-accent-foreground',
              quantity >= 10 && 'opacity-50'
            )}
            onClick={handleIncrease}
            disabled={quantity >= 10}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;
