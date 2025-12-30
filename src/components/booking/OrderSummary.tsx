import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ticket, Calendar, Clock, Users, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';

interface OrderSummaryProps {
  compact?: boolean;
}

const OrderSummary = ({ compact = false }: OrderSummaryProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { tickets, pricing, visitDate, visitTime, totalAmount } = useBookingStore();

  const ticketItems = [
    { type: 'adult', labelAr: 'بالغ', labelEn: 'Adult', count: tickets.adult, price: pricing.adult },
    { type: 'child', labelAr: 'طفل', labelEn: 'Child', count: tickets.child, price: pricing.child },
  ].filter(item => item.count > 0);

  const totalTickets = tickets.adult + tickets.child;

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (isArabic) {
      return hour < 12 ? `${hour}:00 ص` : `${hour === 12 ? 12 : hour - 12}:00 م`;
    }
    return hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`;
  };

  if (totalTickets === 0) {
    return (
      <div className={`bg-card rounded-2xl border border-border p-6 ${compact ? '' : 'sticky top-24'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
            <Ticket className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </h3>
        </div>
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {isArabic ? 'لم يتم اختيار تذاكر بعد' : 'No tickets selected yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${compact ? '' : 'sticky top-24'}`}>
      {/* Header */}
      <div className="bg-primary p-4">
        <div className="flex items-center gap-3 text-primary-foreground">
          <Ticket className="h-5 w-5" />
          <span className="font-semibold">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Visit Details */}
        {(visitDate || visitTime) && (
          <div className="space-y-2 pb-4 border-b border-border">
            {visitDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-accent" />
                <span>{format(new Date(visitDate), 'd MMM yyyy', { locale: isArabic ? ar : enUS })}</span>
              </div>
            )}
            {visitTime && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                <span>{formatTimeDisplay(visitTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tickets Breakdown */}
        <div className="space-y-2">
          {ticketItems.map((item) => (
            <div key={item.type} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {isArabic ? item.labelAr : item.labelEn} × {item.count}
              </span>
              <span className="font-medium">
                {item.count * item.price} {isArabic ? 'ر.س' : 'SAR'}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">
            {isArabic ? 'الإجمالي' : 'Total'}
          </span>
          <div className="text-right rtl:text-left">
            <span className="text-2xl font-bold text-accent">{totalAmount}</span>
            <span className="text-sm text-muted-foreground ml-1 rtl:mr-1 rtl:ml-0">
              {isArabic ? 'ر.س' : 'SAR'}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="h-4 w-4" />
          <span>{isArabic ? 'دفع آمن' : 'Secure payment'}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
