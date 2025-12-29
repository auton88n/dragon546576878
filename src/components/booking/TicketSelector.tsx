import { Minus, Plus, Users, Baby, UserCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TicketSelector = () => {
  const { t, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { tickets, pricing, setTickets } = useBookingStore();

  const ticketTypes = [
    {
      type: 'adult' as const,
      icon: Users,
      labelAr: 'بالغ',
      labelEn: 'Adult',
      descAr: '12 سنة فما فوق',
      descEn: '12 years and above',
      price: pricing.adult,
      count: tickets.adult,
    },
    {
      type: 'child' as const,
      icon: Baby,
      labelAr: 'طفل',
      labelEn: 'Child',
      descAr: 'أقل من 12 سنة',
      descEn: 'Under 12 years',
      price: pricing.child,
      count: tickets.child,
    },
    {
      type: 'senior' as const,
      icon: UserCheck,
      labelAr: 'كبار السن',
      labelEn: 'Senior',
      descAr: '60 سنة فما فوق',
      descEn: '60 years and above',
      price: pricing.senior,
      count: tickets.senior,
    },
  ];

  const totalTickets = tickets.adult + tickets.child + tickets.senior;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('booking.selectTickets')}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'اختر عدد التذاكر لكل فئة' : 'Select the number of tickets for each category'}
        </p>
      </div>

      <div className="grid gap-4">
        {ticketTypes.map((ticket) => (
          <Card 
            key={ticket.type}
            className={cn(
              'border-2 transition-all duration-300',
              ticket.count > 0 ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                {/* Ticket Info */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
                    ticket.count > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  )}>
                    <ticket.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {isArabic ? ticket.labelAr : ticket.labelEn}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? ticket.descAr : ticket.descEn}
                    </p>
                  </div>
                </div>

                {/* Price & Counter */}
                <div className="flex items-center gap-6">
                  <div className="text-right rtl:text-left">
                    <span className="text-2xl font-bold text-primary">{ticket.price}</span>
                    <span className="text-sm text-muted-foreground mr-1 rtl:ml-1 rtl:mr-0">
                      {isArabic ? 'ر.س' : 'SAR'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setTickets(ticket.type, ticket.count - 1)}
                      disabled={ticket.count === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-xl font-semibold">
                      {ticket.count}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setTickets(ticket.type, ticket.count + 1)}
                      disabled={ticket.count >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Tickets Info */}
      {totalTickets > 0 && (
        <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-lg font-medium text-primary">
            {isArabic 
              ? `إجمالي التذاكر: ${totalTickets} تذكرة`
              : `Total Tickets: ${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`
            }
          </span>
        </div>
      )}

      {totalTickets === 0 && (
        <p className="text-center text-muted-foreground text-sm">
          {isArabic ? 'يرجى اختيار تذكرة واحدة على الأقل للمتابعة' : 'Please select at least one ticket to continue'}
        </p>
      )}
    </div>
  );
};

export default TicketSelector;
