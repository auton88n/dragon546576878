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
      <div className={`glass-card rounded-2xl p-6 ${compact ? '' : 'sticky top-24'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </h3>
        </div>
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isArabic ? 'لم يتم اختيار تذاكر بعد' : 'No tickets selected yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${compact ? '' : 'sticky top-24'}`}>
      {/* Header */}
      <div className="gradient-bg p-4">
        <div className="flex items-center gap-3 text-white">
          <Ticket className="h-5 w-5" />
          <span className="font-semibold">
            {isArabic ? 'ملخص الطلب' : 'Order Summary'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Visit Details */}
        {(visitDate || visitTime) && (
          <div className="space-y-3 pb-5 border-b border-border/50">
            {visitDate && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium">
                  {format(new Date(visitDate), 'EEEE, d MMM yyyy', { locale: isArabic ? ar : enUS })}
                </span>
              </div>
            )}
            {visitTime && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium">{formatTimeDisplay(visitTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tickets Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{isArabic ? 'التذاكر' : 'Tickets'}</span>
          </div>
          
          {ticketItems.map((item) => (
            <div key={item.type} className="flex justify-between items-center">
              <span className="text-foreground">
                {isArabic ? item.labelAr : item.labelEn}
                <span className="text-muted-foreground mx-2">×</span>
                {item.count}
              </span>
              <span className="font-medium">
                {item.count * item.price} {isArabic ? 'ر.س' : 'SAR'}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-foreground">
            {isArabic ? 'الإجمالي' : 'Total'}
          </span>
          <div className="text-right rtl:text-left">
            <span className="text-3xl font-bold gradient-text">{totalAmount}</span>
            <span className="text-sm text-muted-foreground ml-1 rtl:mr-1 rtl:ml-0">
              {isArabic ? 'ر.س' : 'SAR'}
            </span>
          </div>
        </div>

        {/* Ticket Count Badge */}
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <span className="text-sm font-medium text-foreground">
            {isArabic 
              ? `${totalTickets} تذكرة`
              : `${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="h-4 w-4" />
          <span>{isArabic ? 'دفع آمن ومشفر' : 'Secure & encrypted payment'}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
