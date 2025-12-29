import { format, isFriday, isBefore, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DateTimePicker = () => {
  const { t, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { visitDate, visitTime, setVisitDate, setVisitTime } = useBookingStore();

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

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

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('booking.selectDateTime')}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'اختر تاريخ ووقت زيارتك' : 'Choose your visit date and time'}
        </p>
      </div>

      {/* Date Selection */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('booking.date')}</h3>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-14 text-lg',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-3 rtl:ml-3 rtl:mr-0 h-5 w-5" />
                {selectedDate ? (
                  format(selectedDate, 'PPP', { locale: isArabic ? ar : enUS })
                ) : (
                  <span>{isArabic ? 'اختر التاريخ' : 'Select date'}</span>
                )}
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

          <p className="text-sm text-muted-foreground mt-3">
            {isArabic ? '* مغلق يوم الجمعة' : '* Closed on Fridays'}
          </p>
        </CardContent>
      </Card>

      {/* Time Selection */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('booking.time')}</h3>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {timeSlots.map((time) => (
              <Button
                key={time}
                variant={visitTime === time ? 'default' : 'outline'}
                className={cn(
                  'h-12 text-base transition-all',
                  visitTime === time && 'ring-2 ring-primary/20'
                )}
                onClick={() => setVisitTime(time)}
              >
                {formatTimeDisplay(time)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {(visitDate || visitTime) && (
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
          <p className="text-lg font-medium text-primary">
            {visitDate && visitTime ? (
              isArabic 
                ? `موعد الزيارة: ${format(new Date(visitDate), 'PPP', { locale: ar })} - ${formatTimeDisplay(visitTime)}`
                : `Visit: ${format(new Date(visitDate), 'PPP', { locale: enUS })} at ${formatTimeDisplay(visitTime)}`
            ) : visitDate ? (
              isArabic 
                ? `التاريخ: ${format(new Date(visitDate), 'PPP', { locale: ar })} - يرجى اختيار الوقت`
                : `Date: ${format(new Date(visitDate), 'PPP', { locale: enUS })} - Please select time`
            ) : (
              isArabic ? 'يرجى اختيار التاريخ' : 'Please select date'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
