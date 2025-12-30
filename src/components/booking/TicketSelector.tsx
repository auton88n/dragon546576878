import { Minus, Plus, Users, Baby, CalendarIcon, Clock, Check } from 'lucide-react';
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
  const { tickets, pricing, setTickets, visitDate, visitTime, setVisitDate, setVisitTime } = useBookingStore();

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

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (isArabic) {
      return hour < 12 ? `${hour}:00 ص` : `${hour === 12 ? 12 : hour - 12}:00 م`;
    }
    return hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`;
  };

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
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center">1</span>
          {isArabic ? 'اختر التذاكر' : 'Select Tickets'}
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {ticketTypes.map((ticket) => (
            <div
              key={ticket.type}
              className={cn(
                'p-4 rounded-xl border-2 transition-all duration-200',
                ticket.count > 0 
                  ? 'border-accent bg-accent/5' 
                  : 'border-border hover:border-accent/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    ticket.count > 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary'
                  )}>
                    <ticket.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
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
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTickets(ticket.type, ticket.count - 1)}
                    disabled={ticket.count === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold text-lg">{ticket.count}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
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
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center">2</span>
          {isArabic ? 'اختر التاريخ' : 'Select Date'}
        </h3>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start h-12 text-base rounded-xl border-2',
                selectedDate ? 'border-accent bg-accent/5' : 'border-border'
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
              {selectedDate && <Check className="h-4 w-4 text-accent ml-auto rtl:mr-auto rtl:ml-0" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
      </div>

      {/* Time Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center">3</span>
          {isArabic ? 'اختر الوقت' : 'Select Time'}
        </h3>
        
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.map((time) => (
            <Button
              key={time}
              variant="outline"
              className={cn(
                'h-11 text-sm font-medium rounded-lg border-2 transition-all',
                visitTime === time 
                  ? 'border-accent bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'border-border hover:border-accent/50'
              )}
              onClick={() => setVisitTime(time)}
            >
              {formatTimeDisplay(time)}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {totalTickets > 0 && visitDate && visitTime && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-accent">
            <Check className="h-5 w-5" />
            <span className="font-medium">{isArabic ? 'جاهز للمتابعة' : 'Ready to continue'}</span>
          </div>
        </div>
      )}

      {totalTickets === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {isArabic ? 'اختر تذكرة واحدة على الأقل' : 'Select at least one ticket'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;
