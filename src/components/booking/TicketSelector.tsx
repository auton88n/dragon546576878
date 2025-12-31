import { Minus, Plus, Users, Baby, CalendarIcon, Check, Sun } from 'lucide-react';
import { format, isFriday, isBefore, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const TicketSelector = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { tickets, pricing, setTickets, visitDate, setVisitDate } = useBookingStore();

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
  ];

  const disabledDays = (date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || isFriday(date);
  };

  const selectedDate = visitDate ? new Date(visitDate) : undefined;
  const totalTickets = tickets.adult + tickets.child;

  return (
    <div className="space-y-8">
      {/* Ticket Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-8 h-8 rounded-full gradient-gold text-foreground text-sm flex items-center justify-center font-bold glow-gold">1</span>
          {isArabic ? 'اختر التذاكر' : 'Select Tickets'}
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {ticketTypes.map((ticket, index) => (
            <div
              key={ticket.type}
              className={cn(
                'p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg',
                ticket.count > 0 
                  ? 'border-accent bg-accent/5 shadow-md' 
                  : 'border-border hover:border-accent/50'
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
                    ticket.count > 0 ? 'gradient-gold glow-gold' : 'bg-secondary'
                  )}>
                    <ticket.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-lg">
                      {isArabic ? ticket.labelAr : ticket.labelEn}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.price} {isArabic ? 'ر.س' : 'SAR'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-2 hover:border-accent hover:bg-accent/10 transition-all"
                    onClick={() => setTickets(ticket.type, ticket.count - 1)}
                    disabled={ticket.count === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-xl text-foreground">{ticket.count}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-2 hover:bg-accent hover:text-foreground hover:border-accent transition-all"
                    onClick={() => setTickets(ticket.type, ticket.count + 1)}
                    disabled={ticket.count >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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
              <CalendarIcon className="mr-3 rtl:ml-3 rtl:mr-0 h-5 w-5 text-accent" />
              {selectedDate ? (
                <span className="font-medium">
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: isArabic ? ar : enUS })}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {isArabic ? 'اضغط لاختيار التاريخ' : 'Click to select date'}
                </span>
              )}
              {selectedDate && <Check className="h-5 w-5 text-accent ml-auto rtl:mr-auto rtl:ml-0" />}
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
      {totalTickets > 0 && visitDate && (
        <div className="bg-accent/10 border-2 border-accent/30 rounded-2xl p-5 text-center animate-scale-in">
          <div className="flex items-center justify-center gap-2 text-accent">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">{isArabic ? 'جاهز للمتابعة' : 'Ready to continue'}</span>
          </div>
        </div>
      )}

      {totalTickets === 0 && (
        <div className="border-2 border-dashed border-border rounded-2xl p-5 text-center">
          <p className="text-muted-foreground">
            {isArabic ? 'اختر تذكرة واحدة على الأقل' : 'Select at least one ticket'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;
