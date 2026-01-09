import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar, Clock, User, Mail, Phone, Save, Loader2, CreditCard, FileText } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logPaymentEvent } from '@/hooks/usePaymentLogs';
import { markBookingAsPaid } from '@/lib/manualPaymentService';
import type { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Booking = Tables<'bookings'>;

interface EditBookingDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated?: () => void;
}

const TIME_SLOTS = [
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const PAYMENT_STATUSES = [
  { value: 'pending', labelAr: 'معلق', labelEn: 'Pending', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
  { value: 'completed', labelAr: 'مكتمل', labelEn: 'Completed', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  { value: 'failed', labelAr: 'فشل', labelEn: 'Failed', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
];

const BOOKING_STATUSES = [
  { value: 'confirmed', labelAr: 'مؤكد', labelEn: 'Confirmed', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  { value: 'cancelled', labelAr: 'ملغى', labelEn: 'Cancelled', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
  { value: 'used', labelAr: 'مستخدم', labelEn: 'Used', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
];

const EditBookingDialog = ({ booking, open, onOpenChange, onBookingUpdated }: EditBookingDialogProps) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const isArabic = currentLanguage === 'ar';
  const [saving, setSaving] = useState(false);

  // Form state
  const [visitDate, setVisitDate] = useState<Date | undefined>();
  const [visitTime, setVisitTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  // Initialize form when booking changes
  useEffect(() => {
    if (booking && open) {
      setVisitDate(new Date(booking.visit_date));
      setVisitTime(booking.visit_time);
      setCustomerName(booking.customer_name);
      setCustomerEmail(booking.customer_email);
      setCustomerPhone(booking.customer_phone);
      setSpecialRequests(booking.special_requests || '');
      setPaymentStatus(booking.payment_status);
      setBookingStatus(booking.booking_status);
    }
  }, [booking, open]);

  const handleSave = async () => {
    if (!booking || !visitDate) return;

    setSaving(true);
    try {
      // Check if payment status is changing to completed
      const changingToCompleted = paymentStatus === 'completed' && booking.payment_status !== 'completed';
      
      if (changingToCompleted) {
        // Use the helper that generates tickets and sends email
        const result = await markBookingAsPaid(booking.id, user?.id);
        if (!result.success) throw new Error(result.error);
        
        // Also update any other changed fields
        const { error } = await supabase
          .from('bookings')
          .update({
            visit_date: format(visitDate, 'yyyy-MM-dd'),
            visit_time: visitTime,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim(),
            customer_phone: customerPhone.trim(),
            special_requests: specialRequests.trim() || null,
            booking_status: bookingStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (error) throw error;
      } else {
        // Normal update for other changes
        const paymentStatusChanged = paymentStatus !== booking.payment_status;
        
        let paidAt = booking.paid_at;
        if (paymentStatus === 'pending' && booking.payment_status === 'completed') {
          paidAt = null;
        }

        const { error } = await supabase
          .from('bookings')
          .update({
            visit_date: format(visitDate, 'yyyy-MM-dd'),
            visit_time: visitTime,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim(),
            customer_phone: customerPhone.trim(),
            special_requests: specialRequests.trim() || null,
            payment_status: paymentStatus,
            booking_status: bookingStatus,
            paid_at: paidAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (error) throw error;

        // Log payment status change if it changed
        if (paymentStatusChanged) {
          await logPaymentEvent(booking.id, 'manual_update', {
            statusBefore: booking.payment_status,
            statusAfter: paymentStatus,
            changedBy: user?.id,
            amount: Number(booking.total_amount),
            paymentMethod: 'manual',
          });
        }
      }

      toast({
        title: isArabic ? 'تم الحفظ' : 'Saved',
        description: changingToCompleted 
          ? (isArabic ? 'تم تحديث الحجز وإنشاء التذاكر' : 'Booking updated and tickets generated')
          : (isArabic ? 'تم تحديث الحجز بنجاح' : 'Booking updated successfully'),
      });

      onBookingUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تحديث الحجز' : 'Failed to update booking',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getPaymentStatusInfo = (value: string) => PAYMENT_STATUSES.find(s => s.value === value);
  const getBookingStatusInfo = (value: string) => BOOKING_STATUSES.find(s => s.value === value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-card border-accent/20 pt-10 max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-accent/10 pe-12 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground rtl:flex-row-reverse">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            {isArabic ? 'تعديل الحجز' : 'Edit Booking'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-5 py-4 px-1">
            {/* Booking Reference (read-only) */}
            <div className="bg-accent/10 rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground">{isArabic ? 'رقم الحجز' : 'Booking Reference'}</span>
              <p className="font-mono font-bold text-accent text-lg">{booking.booking_reference}</p>
            </div>

            {/* Status Section */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2 rtl:flex-row-reverse">
                <FileText className="h-4 w-4" />
                {isArabic ? 'حالة الحجز والدفع' : 'Booking & Payment Status'}
              </h4>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                  <CreditCard className="h-4 w-4 text-accent" />
                  {isArabic ? 'حالة الدفع' : 'Payment Status'}
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger className="border-accent/20 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              status.value === 'pending' && "bg-yellow-500",
                              status.value === 'completed' && "bg-green-500",
                              status.value === 'failed' && "bg-red-500"
                            )} />
                            {isArabic ? status.labelAr : status.labelEn}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getPaymentStatusInfo(paymentStatus) && (
                    <Badge variant="outline" className={cn("shrink-0", getPaymentStatusInfo(paymentStatus)?.color)}>
                      {isArabic ? getPaymentStatusInfo(paymentStatus)?.labelAr : getPaymentStatusInfo(paymentStatus)?.labelEn}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Booking Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                  <FileText className="h-4 w-4 text-accent" />
                  {isArabic ? 'حالة الحجز' : 'Booking Status'}
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Select value={bookingStatus} onValueChange={setBookingStatus}>
                    <SelectTrigger className="border-accent/20 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              status.value === 'confirmed' && "bg-green-500",
                              status.value === 'cancelled' && "bg-red-500",
                              status.value === 'used' && "bg-blue-500"
                            )} />
                            {isArabic ? status.labelAr : status.labelEn}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getBookingStatusInfo(bookingStatus) && (
                    <Badge variant="outline" className={cn("shrink-0", getBookingStatusInfo(bookingStatus)?.color)}>
                      {isArabic ? getBookingStatusInfo(bookingStatus)?.labelAr : getBookingStatusInfo(bookingStatus)?.labelEn}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Visit Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                <Calendar className="h-4 w-4 text-accent" />
                {isArabic ? 'تاريخ الزيارة' : 'Visit Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-start font-normal border-accent/20",
                      !visitDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    {visitDate ? format(visitDate, 'PPP', { locale: isArabic ? ar : enUS }) : (isArabic ? 'اختر التاريخ' : 'Pick a date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={visitDate}
                    onSelect={setVisitDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Visit Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                <Clock className="h-4 w-4 text-accent" />
                {isArabic ? 'وقت الزيارة' : 'Visit Time'}
              </Label>
              <Select value={visitTime} onValueChange={setVisitTime}>
                <SelectTrigger className="border-accent/20">
                  <SelectValue placeholder={isArabic ? 'اختر الوقت' : 'Select time'} />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                <User className="h-4 w-4 text-accent" />
                {isArabic ? 'اسم العميل' : 'Customer Name'}
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border-accent/20"
              />
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                <Mail className="h-4 w-4 text-accent" />
                {isArabic ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="border-accent/20"
              />
            </div>

            {/* Customer Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 rtl:flex-row-reverse">
                <Phone className="h-4 w-4 text-accent" />
                {isArabic ? 'رقم الهاتف' : 'Phone'}
              </Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="border-accent/20"
                dir="ltr"
              />
            </div>

            {/* Special Requests */}
            <div className="space-y-2">
              <Label>{isArabic ? 'طلبات خاصة' : 'Special Requests'}</Label>
              <Input
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder={isArabic ? 'ملاحظات إضافية...' : 'Additional notes...'}
                className="border-accent/20"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t border-accent/10 gap-2 sm:gap-0 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !visitDate || !customerName.trim() || !customerEmail.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingDialog;
