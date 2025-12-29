import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ticket, Calendar, Clock, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
  compact?: boolean;
}

const OrderSummary = ({ compact = false }: OrderSummaryProps) => {
  const { t, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { tickets, pricing, visitDate, visitTime, totalAmount } = useBookingStore();

  const ticketItems = [
    { type: 'adult', labelAr: 'بالغ', labelEn: 'Adult', count: tickets.adult, price: pricing.adult },
    { type: 'child', labelAr: 'طفل', labelEn: 'Child', count: tickets.child, price: pricing.child },
    { type: 'senior', labelAr: 'كبار السن', labelEn: 'Senior', count: tickets.senior, price: pricing.senior },
  ].filter(item => item.count > 0);

  const totalTickets = tickets.adult + tickets.child + tickets.senior;

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (isArabic) {
      return hour < 12 ? `${hour}:00 ص` : `${hour === 12 ? 12 : hour - 12}:00 م`;
    }
    return hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`;
  };

  if (totalTickets === 0) {
    return (
      <Card className={compact ? '' : 'sticky top-24'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-primary" />
            {t('booking.orderSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {isArabic ? 'لم يتم اختيار تذاكر بعد' : 'No tickets selected yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'sticky top-24 shadow-lg'}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ticket className="h-5 w-5 text-primary" />
          {t('booking.orderSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visit Details */}
        {(visitDate || visitTime) && (
          <>
            <div className="space-y-2">
              {visitDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{format(new Date(visitDate), 'PPP', { locale: isArabic ? ar : enUS })}</span>
                </div>
              )}
              {visitTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{formatTimeDisplay(visitTime)}</span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Tickets Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            <span>{isArabic ? 'التذاكر' : 'Tickets'}</span>
          </div>
          
          {ticketItems.map((item) => (
            <div key={item.type} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isArabic ? item.labelAr : item.labelEn} x {item.count}
              </span>
              <span className="font-medium">
                {item.count * item.price} {isArabic ? 'ر.س' : 'SAR'}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">{t('booking.total')}</span>
          <div className="text-right rtl:text-left">
            <span className="text-2xl font-bold text-primary">{totalAmount}</span>
            <span className="text-sm text-muted-foreground mr-1 rtl:ml-1 rtl:mr-0">
              {isArabic ? 'ر.س' : 'SAR'}
            </span>
          </div>
        </div>

        {/* Total Tickets Count */}
        <p className="text-center text-sm text-muted-foreground bg-secondary/50 py-2 rounded-lg">
          {isArabic 
            ? `${totalTickets} تذكرة`
            : `${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`}
        </p>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
