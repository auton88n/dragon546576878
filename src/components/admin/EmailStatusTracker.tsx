import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { MailCheck, MailX, Clock, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailRecord {
  id: string;
  email_type: string;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
  attempts: number | null;
  error_message: string | null;
  to_email: string;
}

interface EmailStatusTrackerProps {
  bookingId: string;
}

const EmailStatusTracker = ({ bookingId }: EmailStatusTrackerProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailHistory();
  }, [bookingId]);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_queue')
        .select('id, email_type, status, sent_at, created_at, attempts, error_message, to_email')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching email history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'PPp', { locale: isArabic ? ar : enUS });
  };

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'sent':
        return {
          icon: MailCheck,
          className: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
          label: isArabic ? 'تم الإرسال' : 'Sent',
          iconClassName: 'text-emerald-600',
        };
      case 'failed':
        return {
          icon: MailX,
          className: 'bg-red-500/20 text-red-700 border-red-500/30',
          label: isArabic ? 'فشل' : 'Failed',
          iconClassName: 'text-red-600',
        };
      case 'pending':
        return {
          icon: Clock,
          className: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
          label: isArabic ? 'في الانتظار' : 'Pending',
          iconClassName: 'text-amber-600',
        };
      case 'retrying':
        return {
          icon: RefreshCw,
          className: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
          label: isArabic ? 'إعادة المحاولة' : 'Retrying',
          iconClassName: 'text-blue-600',
        };
      default:
        return {
          icon: Send,
          className: 'bg-muted text-muted-foreground border-muted',
          label: status || (isArabic ? 'غير معروف' : 'Unknown'),
          iconClassName: 'text-muted-foreground',
        };
    }
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      booking_confirmation: { ar: 'تأكيد الحجز', en: 'Booking Confirmation' },
      payment_reminder: { ar: 'تذكير بالدفع', en: 'Payment Reminder' },
      booking_cancelled: { ar: 'إلغاء الحجز', en: 'Booking Cancelled' },
    };
    return isArabic ? labels[type]?.ar : labels[type]?.en || type;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full bg-accent/10" />
        <Skeleton className="h-16 w-full bg-accent/10" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <MailX className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{isArabic ? 'لا يوجد سجل للبريد الإلكتروني' : 'No email history'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => {
        const statusConfig = getStatusConfig(email.status);
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={email.id}
            className="rounded-lg border border-accent/10 p-4 bg-background/50 hover:bg-background/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 rtl:flex-row-reverse">
              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  email.status === 'sent' ? 'bg-emerald-500/20' :
                  email.status === 'failed' ? 'bg-red-500/20' :
                  email.status === 'pending' ? 'bg-amber-500/20' : 'bg-muted'
                }`}>
                  <StatusIcon className={`h-5 w-5 ${statusConfig.iconClassName}`} />
                </div>
                <div className="text-start rtl:text-end">
                  <p className="font-medium text-foreground">{getEmailTypeLabel(email.email_type)}</p>
                  <p className="text-xs text-muted-foreground">{email.to_email}</p>
                </div>
              </div>
              <Badge variant="outline" className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs rtl:text-end">
              <div>
                <p className="text-muted-foreground">{isArabic ? 'وقت الإنشاء' : 'Created'}</p>
                <p className="text-foreground">{formatDateTime(email.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{isArabic ? 'وقت الإرسال' : 'Sent At'}</p>
                <p className="text-foreground">{formatDateTime(email.sent_at)}</p>
              </div>
            </div>

            {email.attempts && email.attempts > 1 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 rtl:flex-row-reverse">
                <AlertTriangle className="h-3 w-3" />
                <span>{isArabic ? `${email.attempts} محاولات` : `${email.attempts} attempts`}</span>
              </div>
            )}

            {email.error_message && (
              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-600 font-mono text-start rtl:text-end">{email.error_message}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EmailStatusTracker;
