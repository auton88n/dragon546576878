import { useState } from 'react';
import { CheckCircle, Ban, Bell, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { sendPaymentReminder } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

interface BulkActionsBarProps {
  selectedIds: string[];
  bookings: Booking[];
  onClearSelection: () => void;
  onBookingUpdated: () => void;
}

const BulkActionsBar = ({ selectedIds, bookings, onClearSelection, onBookingUpdated }: BulkActionsBarProps) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [loading, setLoading] = useState<string | null>(null);

  const selectedBookings = bookings.filter(b => selectedIds.includes(b.id));
  const pendingPaymentBookings = selectedBookings.filter(b => b.payment_status === 'pending' && b.booking_status !== 'cancelled');
  const cancellableBookings = selectedBookings.filter(b => b.booking_status !== 'cancelled');

  const handleBulkMarkAsPaid = async () => {
    if (pendingPaymentBookings.length === 0) return;
    setLoading('markPaid');
    try {
      const ids = pendingPaymentBookings.map(b => b.id);
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'completed', 
          paid_at: new Date().toISOString(),
          booking_status: 'confirmed'
        })
        .in('id', ids);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم التحديث' : 'Updated',
        description: isArabic 
          ? `تم تحديث ${ids.length} حجز` 
          : `${ids.length} booking(s) marked as paid`,
      });
      onBookingUpdated();
      onClearSelection();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل التحديث' : 'Failed to update bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleBulkCancel = async () => {
    if (cancellableBookings.length === 0) return;
    setLoading('cancel');
    try {
      const ids = cancellableBookings.map(b => b.id);
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'cancelled', 
          cancelled_at: new Date().toISOString() 
        })
        .in('id', ids);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم الإلغاء' : 'Cancelled',
        description: isArabic 
          ? `تم إلغاء ${ids.length} حجز` 
          : `${ids.length} booking(s) cancelled`,
      });
      onBookingUpdated();
      onClearSelection();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل الإلغاء' : 'Failed to cancel bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleBulkSendReminder = async () => {
    if (pendingPaymentBookings.length === 0) return;
    setLoading('reminder');
    try {
      let successCount = 0;
      for (const booking of pendingPaymentBookings) {
        const success = await sendPaymentReminder(booking.id);
        if (success) successCount++;
      }
      toast({
        title: isArabic ? 'تم الإرسال' : 'Sent',
        description: isArabic 
          ? `تم إرسال ${successCount} رسالة تذكير بالدفع` 
          : `${successCount} payment reminder(s) sent`,
      });
      onBookingUpdated();
      onClearSelection();
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إرسال التذكيرات' : 'Failed to send reminders',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="glass-card border border-accent/30 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 rtl:[direction:rtl]">
        {/* Count */}
        <div className="flex items-center gap-2 pe-3 border-e border-accent/20">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm">
            {selectedIds.length}
          </span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {isArabic ? 'محدد' : 'selected'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {pendingPaymentBookings.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleBulkMarkAsPaid}
                disabled={loading !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
              >
                {loading === 'markPaid' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{isArabic ? 'تأكيد الدفع' : 'Mark Paid'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkSendReminder}
                disabled={loading !== null}
                className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 gap-1.5 text-xs"
              >
                {loading === 'reminder' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{isArabic ? 'تذكير' : 'Remind'}</span>
              </Button>
            </>
          )}
          {cancellableBookings.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkCancel}
              disabled={loading !== null}
              className="border-red-500/50 text-red-600 hover:bg-red-500/10 gap-1.5 text-xs"
            >
              {loading === 'cancel' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isArabic ? 'إلغاء' : 'Cancel'}</span>
            </Button>
          )}
        </div>

        {/* Clear */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="text-muted-foreground hover:text-foreground ms-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;