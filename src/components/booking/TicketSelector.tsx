import { CalendarIcon, Check, Sun } from 'lucide-react';
import { format, isFriday, isBefore, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import PackageCard, { type Package } from './PackageCard';

// Hardcoded packages - can be moved to database later
const PACKAGES: Package[] = [
  {
    id: 'adult-single',
    nameEn: 'Adult Ticket',
    nameAr: 'تذكرة بالغ',
    descriptionEn: 'Single adult entry',
    descriptionAr: 'دخول بالغ واحد',
    adults: 1,
    children: 0,
    price: 40,
  },
  {
    id: 'child-single',
    nameEn: 'Child Ticket',
    nameAr: 'تذكرة طفل',
    descriptionEn: 'Single child entry (under 12)',
    descriptionAr: 'دخول طفل واحد (أقل من 12 سنة)',
    adults: 0,
    children: 1,
    price: 25,
  },
  {
    id: 'family-small',
    nameEn: 'Small Family',
    nameAr: 'عائلة صغيرة',
    descriptionEn: '2 adults + 3 children',
    descriptionAr: '٢ بالغين + ٣ أطفال',
    adults: 2,
    children: 3,
    price: 149.99,
    badge: 'value',
  },
  {
    id: 'family-large',
    nameEn: 'Large Family',
    nameAr: 'عائلة كبيرة',
    descriptionEn: '2 adults + 6 children',
    descriptionAr: '٢ بالغين + ٦ أطفال',
    adults: 2,
    children: 6,
    price: 199.99,
    badge: 'popular',
  },
];

const TicketSelector = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { 
    packageQuantities,
    setPackageQuantity, 
    getPackageQuantity,
    visitDate, 
    setVisitDate,
    tickets
  } = useBookingStore();

  const disabledDays = (date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || isFriday(date);
  };

  const selectedDate = visitDate ? new Date(visitDate) : undefined;
  const totalTickets = tickets.adult + tickets.child;

  return (
    <div className="space-y-8">
      {/* Package Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">1</span>
          {isArabic ? 'اختر الباقة' : 'Choose Package'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PACKAGES.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package_={pkg}
              quantity={getPackageQuantity(pkg.id)}
              onQuantityChange={(qty) => setPackageQuantity(pkg.id, qty, pkg.adults, pkg.children, pkg.price)}
            />
          ))}
        </div>
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
