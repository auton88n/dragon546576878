import { format, isFriday, isBefore, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { CalendarIcon, Clock, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DateTimePicker = () => {
  const { currentLanguage } = useLanguage();
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
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {isArabic ? 'اختر الموعد' : 'Choose Date & Time'}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'حدد تاريخ ووقت زيارتك المفضل' : 'Select your preferred visit date and time'}
        </p>
      </div>

      {/* Date Selection */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isArabic ? 'تاريخ الزيارة' : 'Visit Date'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'مغلق يوم الجمعة' : 'Closed on Fridays'}
            </p>
          </div>
          {selectedDate && (
            <div className="ml-auto rtl:mr-auto rtl:ml-0">
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-14 text-lg rounded-xl border-2',
                selectedDate ? 'border-accent/50 bg-accent/5' : 'border-border',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-3 rtl:ml-3 rtl:mr-0 h-5 w-5 text-accent" />
              {selectedDate ? (
                <span className="font-medium">
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: isArabic ? ar : enUS })}
                </span>
              ) : (
                <span>{isArabic ? 'اضغط لاختيار التاريخ' : 'Click to select date'}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-2" align="start">
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
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isArabic ? 'وقت الزيارة' : 'Visit Time'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'اختر الوقت المناسب' : 'Select a time slot'}
            </p>
          </div>
          {visitTime && (
            <div className="ml-auto rtl:mr-auto rtl:ml-0">
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((time) => {
            const isSelected = visitTime === time;
            return (
              <Button
                key={time}
                variant="outline"
                className={cn(
                  'h-14 text-base font-medium rounded-xl border-2 transition-all duration-200',
                  isSelected 
                    ? 'border-accent bg-accent text-white hover:bg-accent/90' 
                    : 'border-border hover:border-accent/50 hover:bg-accent/5'
                )}
                onClick={() => setVisitTime(time)}
              >
                {formatTimeDisplay(time)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {visitDate && visitTime && (
        <div className="glass-card rounded-2xl p-6 text-center space-y-2 border-accent/30">
          <div className="inline-flex items-center gap-2 text-accent">
            <Check className="h-5 w-5" />
            <span className="font-medium">
              {isArabic ? 'تم تحديد الموعد' : 'Appointment Selected'}
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {format(new Date(visitDate), 'EEEE, d MMMM yyyy', { locale: isArabic ? ar : enUS })}
            <span className="text-accent mx-2">•</span>
            {formatTimeDisplay(visitTime)}
          </p>
        </div>
      )}

      {/* Instructions */}
      {(!visitDate || !visitTime) && (
        <div className="text-center p-4 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">
            {!visitDate 
              ? (isArabic ? 'يرجى اختيار تاريخ الزيارة' : 'Please select a visit date')
              : (isArabic ? 'يرجى اختيار وقت الزيارة' : 'Please select a time slot')
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
