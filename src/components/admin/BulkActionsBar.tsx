import { useState } from 'react';
import { CheckCircle, Ban, Bell, X, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { resendConfirmationEmail } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        const success = await resendConfirmationEmail(booking.id);
        if (success) successCount++;
      }
      toast({
        title: isArabic ? 'تم الإرسال' : 'Sent',
        description: isArabic 
          ? `تم إرسال ${successCount} تذكير` 
          : `${successCount} reminder(s) sent`,
      });
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setLoading('delete');
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      toast({
        title: isArabic ? 'تم الحذف' : 'Deleted',
        description: isArabic 
          ? `تم حذف ${selectedIds.length} حجز` 
          : `${selectedIds.length} booking(s) deleted`,
      });
      onBookingUpdated();
      onClearSelection();
      setShowDeleteConfirm(false);
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل الحذف' : 'Failed to delete bookings',
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading !== null}
            className="border-red-600/50 text-red-700 hover:bg-red-600/10 gap-1.5 text-xs"
          >
            {loading === 'delete' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isArabic ? 'حذف' : 'Delete'}</span>
          </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? `هل أنت متأكد من حذف ${selectedIds.length} حجز؟ سيتم حذف جميع التذاكر المرتبطة. هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to delete ${selectedIds.length} booking(s)? All associated tickets will also be deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkActionsBar;