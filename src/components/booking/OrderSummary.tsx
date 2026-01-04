import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ticket, Calendar, Sun, ShieldCheck, Sparkles, Package } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';

// Package names for display
const PACKAGE_NAMES: Record<string, { en: string; ar: string }> = {
  'adult-single': { en: 'Adult Ticket', ar: 'تذكرة بالغ' },
  'child-single': { en: 'Child Ticket', ar: 'تذكرة طفل' },
  'family-small': { en: 'Small Family Package', ar: 'باقة العائلة الصغيرة' },
  'family-large': { en: 'Large Family Package', ar: 'باقة العائلة الكبيرة' },
};

interface OrderSummaryProps {
  compact?: boolean;
}

const OrderSummary = forwardRef<HTMLDivElement, OrderSummaryProps>(({ compact = false }, ref) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { tickets, visitDate, totalAmount, packageQuantities } = useBookingStore();
  
  // Get package names for display
  const selectedPackages = packageQuantities
    .filter(p => p.quantity > 0)
    .map(p => ({
      name: isArabic ? PACKAGE_NAMES[p.packageId]?.ar : PACKAGE_NAMES[p.packageId]?.en,
      quantity: p.quantity,
      price: p.price * p.quantity,
    }));

  const totalTickets = tickets.adult + tickets.child;

  if (totalTickets === 0) {
    return (
      <div ref={ref} className={`glass-card-gold p-6 ${compact ? '' : 'sticky top-28'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center glow-gold">
            <Ticket className="h-6 w-6 text-foreground" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </h3>
        </div>
        <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
          <Ticket className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? 'لم يتم اختيار تذاكر بعد' : 'No tickets selected yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`glass-card-gold overflow-hidden ${compact ? '' : 'sticky top-28'}`}>
      {/* Header */}
      <div className="gradient-heritage p-5">
        <div className="flex items-center gap-3 text-primary-foreground">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <span className="font-semibold text-lg block">
              {isArabic ? 'ملخص الطلب' : 'Order Summary'}
            </span>
            <span className="text-sm opacity-80">
              {totalTickets} {isArabic ? 'تذكرة' : totalTickets === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Visit Details */}
        {visitDate && (
          <div className="space-y-3 pb-5 border-b border-border">
            <div className="flex items-center gap-3 text-sm group">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
              <span className="font-medium">{format(new Date(visitDate), 'd MMM yyyy', { locale: isArabic ? ar : enUS })}</span>
            </div>
            {/* Valid All Day indicator */}
            <div className="flex items-center gap-3 text-sm group">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
                <Sun className="h-4 w-4 text-accent" />
              </div>
              <span className="font-medium text-accent">
                {isArabic ? 'صالحة طوال اليوم (9 ص - 6 م)' : 'Valid All Day (9 AM - 6 PM)'}
              </span>
            </div>
          </div>
        )}

        {/* Package Breakdown */}
        <div className="space-y-3">
          {selectedPackages.map((pkg, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {pkg.name} × {pkg.quantity}
                </span>
              </div>
              <span className="font-semibold">
                {pkg.price.toFixed(2)} {isArabic ? 'ر.س' : 'SAR'}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-dashed border-border" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground text-lg">
            {isArabic ? 'الإجمالي' : 'Total'}
          </span>
          <div className="text-right rtl:text-left">
            <span className="text-3xl font-bold gradient-text-gold">{totalAmount}</span>
            <span className="text-sm text-muted-foreground ml-1 rtl:mr-1 rtl:ml-0">
              {isArabic ? 'ر.س' : 'SAR'}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>{isArabic ? 'دفع آمن' : 'Secure'}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>{isArabic ? 'تأكيد فوري' : 'Instant'}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

OrderSummary.displayName = 'OrderSummary';
export default OrderSummary;
