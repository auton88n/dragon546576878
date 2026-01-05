import { CalendarIcon, Check, Sun, Sparkles, ShoppingBag, Home, Mountain, Landmark, Building2, TreePalm, Palette, Users, Map, Camera, Music, Coffee, Utensils, Star, Heart } from 'lucide-react';
import { format, isBefore, isAfter, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { usePackages } from '@/hooks/usePackages';
import { useAttractions } from '@/hooks/useAttractions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import PackageCard, { type Package } from './PackageCard';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag, Home, Mountain, Landmark, Building2, TreePalm, Palette, Users, Map, Camera, Music, Coffee, Utensils, Star, Heart, Sun
};

const TicketSelector = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { data: dbPackages, isLoading: packagesLoading } = usePackages();
  const { data: dbAttractions, isLoading: attractionsLoading } = useAttractions();
  const { 
    packageQuantities,
    setPackageQuantity, 
    getPackageQuantity,
    visitDate, 
    setVisitDate,
    tickets
  } = useBookingStore();

  // Booking window: January 7-16, 2026 (all days open including Friday)
  const bookingStartDate = new Date(2026, 0, 7);
  const bookingEndDate = new Date(2026, 0, 16);

  const disabledDays = (date: Date) => {
    const dateToCheck = startOfDay(date);
    return isBefore(dateToCheck, bookingStartDate) || isAfter(dateToCheck, bookingEndDate);
  };

  const selectedDate = visitDate ? new Date(visitDate) : undefined;

  // Map database packages to component format
  const packages: Package[] = (dbPackages || []).map(pkg => ({
    id: pkg.id,
    nameEn: pkg.name_en,
    nameAr: pkg.name_ar,
    descriptionEn: pkg.description_en || '',
    descriptionAr: pkg.description_ar || '',
    adults: pkg.adult_count,
    children: pkg.child_count,
    price: Number(pkg.price),
  }));

  return (
    <div className="space-y-8">
      {/* Package Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">1</span>
          {isArabic ? 'اختر الباقة' : 'Choose Package'}
        </h3>
        
        {packagesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                package_={pkg}
                quantity={getPackageQuantity(pkg.id)}
                onQuantityChange={(qty) => setPackageQuantity(pkg.id, qty, pkg.adults, pkg.children, pkg.price)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Date Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">2</span>
          {isArabic ? 'اختر التاريخ' : 'Select Date'}
        </h3>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start h-14 text-base rounded-xl border-2 transition-all duration-300 hover:shadow-md',
                selectedDate ? 'border-accent bg-accent/5 shadow-sm' : 'border-border hover:border-accent/50'
              )}
            >
              <CalendarIcon className="me-3 h-5 w-5 text-accent" />
              {selectedDate ? (
                <span className="font-medium">
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: isArabic ? ar : enUS })}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {isArabic ? 'اضغط لاختيار التاريخ' : 'Click to select date'}
                </span>
              )}
              {selectedDate && <Check className="h-5 w-5 text-accent ms-auto" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-card" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setVisitDate(format(date, 'yyyy-MM-dd'))}
              disabled={disabledDays}
              defaultMonth={bookingStartDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={isArabic ? ar : enUS}
            />
          </PopoverContent>
        </Popover>

        {/* Valid All Day Message */}
        {selectedDate && (
          <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/20">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Sun className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isArabic ? 'صالحة طوال اليوم' : 'Valid All Day'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? 'تعال في أي وقت خلال ساعات العمل (9 ص - 6 م)' 
                  : 'Come anytime during operating hours (9 AM - 6 PM)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* What You'll Experience */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">
            <Sparkles className="h-4 w-4" />
          </span>
          {isArabic ? 'الفعاليات' : 'Events'}
        </h3>
        
        {attractionsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(dbAttractions || []).map((attraction) => {
              const Icon = ICON_MAP[attraction.icon] || Landmark;
              return (
                <div
                  key={attraction.id}
                  className="group p-3 rounded-xl border border-border bg-card/50 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <p className="font-medium text-sm text-foreground leading-tight">
                    {isArabic ? attraction.name_ar : attraction.name_en}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {isArabic ? attraction.description_ar : attraction.description_en}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {packageQuantities.length > 0 && visitDate && (
        <div className="bg-accent/10 border-2 border-accent/30 rounded-2xl p-5 text-center animate-scale-in">
          <div className="flex items-center justify-center gap-2 text-accent">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">{isArabic ? 'جاهز للمتابعة' : 'Ready to continue'}</span>
          </div>
        </div>
      )}

      {packageQuantities.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-2xl p-5 text-center">
          <p className="text-muted-foreground">
            {isArabic ? 'اختر باقة للمتابعة' : 'Select a package to continue'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;
