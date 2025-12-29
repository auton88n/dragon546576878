import { Minus, Plus, Users, Baby } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TicketSelector = () => {
  const { currentLanguage } = useLanguage();
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
      imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
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
      imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop',
    },
  ];

  const totalTickets = tickets.adult + tickets.child;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {isArabic ? 'اختر التذاكر' : 'Select Tickets'}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'اختر نوع وعدد التذاكر للزيارة' : 'Choose ticket type and quantity for your visit'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {ticketTypes.map((ticket) => (
          <div
            key={ticket.type}
            className={cn(
              'ticket-card group cursor-pointer',
              ticket.count > 0 && 'selected'
            )}
          >
            {/* Ticket Image */}
            <div className="relative h-40 overflow-hidden">
              <img 
                src={ticket.imageUrl} 
                alt={isArabic ? ticket.labelAr : ticket.labelEn}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              
              {/* Price Badge */}
              <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                <div className="px-4 py-2 rounded-xl glass-card">
                  <span className="text-xl font-bold gradient-text">{ticket.price}</span>
                  <span className="text-sm text-muted-foreground ml-1 rtl:mr-1 rtl:ml-0">
                    {isArabic ? 'ر.س' : 'SAR'}
                  </span>
                </div>
              </div>

              {/* Selected Badge */}
              {ticket.count > 0 && (
                <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm animate-scale-in">
                    {ticket.count}
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Info */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                  ticket.count > 0 ? 'gradient-bg text-white' : 'bg-secondary text-foreground'
                )}>
                  <ticket.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {isArabic ? ticket.labelAr : ticket.labelEn}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? ticket.descAr : ticket.descEn}
                  </p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">
                  {isArabic ? 'الكمية' : 'Quantity'}
                </span>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-10 w-10 rounded-full border-2 transition-all',
                      ticket.count === 0 && 'opacity-50'
                    )}
                    onClick={() => setTickets(ticket.type, ticket.count - 1)}
                    disabled={ticket.count === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-2xl font-bold">
                    {ticket.count}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-10 w-10 rounded-full border-2 transition-all hover:border-accent hover:bg-accent/10',
                      ticket.count >= 10 && 'opacity-50'
                    )}
                    onClick={() => setTickets(ticket.type, ticket.count + 1)}
                    disabled={ticket.count >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Subtotal */}
              {ticket.count > 0 && (
                <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isArabic ? 'المجموع الفرعي' : 'Subtotal'}
                  </span>
                  <span className="text-lg font-bold gradient-text">
                    {ticket.count * ticket.price} {isArabic ? 'ر.س' : 'SAR'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {totalTickets > 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center space-y-2">
          <div className="text-lg font-medium text-foreground">
            {isArabic 
              ? `إجمالي التذاكر: ${totalTickets} تذكرة`
              : `Total: ${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`
            }
          </div>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? 'اضغط على "التالي" لاختيار موعد الزيارة'
              : 'Click "Continue" to select your visit date'
            }
          </p>
        </div>
      ) : (
        <div className="text-center p-6 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">
            {isArabic ? 'يرجى اختيار تذكرة واحدة على الأقل للمتابعة' : 'Please select at least one ticket to continue'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;
