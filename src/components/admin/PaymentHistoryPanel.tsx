import { memo } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  CircleDot, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  CreditCard,
  User,
  ArrowRight,
  History
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePaymentLogs, PaymentLog } from '@/hooks/usePaymentLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentHistoryPanelProps {
  bookingId: string | null;
}

const PaymentHistoryPanel = memo(({ bookingId }: PaymentHistoryPanelProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { logs, loading } = usePaymentLogs(bookingId);

  const getEventConfig = (eventType: string) => {
    const configs: Record<string, { 
      icon: typeof CircleDot; 
      color: string; 
      bgColor: string;
      labelAr: string; 
      labelEn: string;
    }> = {
      attempt: { 
        icon: RefreshCw, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-500/20',
        labelAr: 'محاولة دفع', 
        labelEn: 'Payment Attempted' 
      },
      success: { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-500/20',
        labelAr: 'تم الدفع', 
        labelEn: 'Payment Completed' 
      },
      failure: { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-500/20',
        labelAr: 'فشل الدفع', 
        labelEn: 'Payment Failed' 
      },
      manual_update: { 
        icon: User, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-500/20',
        labelAr: 'تحديث يدوي', 
        labelEn: 'Manual Update' 
      },
      refund: { 
        icon: CreditCard, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-500/20',
        labelAr: 'استرداد', 
        labelEn: 'Refund' 
      },
    };
    return configs[eventType] || configs.attempt;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '-';
    const methods: Record<string, { ar: string; en: string }> = {
      creditcard: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
      mada: { ar: 'مدى', en: 'mada' },
      applepay: { ar: 'Apple Pay', en: 'Apple Pay' },
      manual: { ar: 'يدوي', en: 'Manual' },
    };
    return isArabic ? methods[method]?.ar : methods[method]?.en || method;
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), 'PPp', { locale: isArabic ? ar : enUS });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>{isArabic ? 'لا يوجد سجل دفع' : 'No payment history'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const config = getEventConfig(log.event_type);
        const Icon = config.icon;
        const isLast = index === logs.length - 1;

        return (
          <div key={log.id} className="relative flex gap-4 rtl:flex-row-reverse">
            {/* Timeline line */}
            {!isLast && (
              <div 
                className="absolute top-10 bottom-0 start-5 w-0.5 bg-accent/20 rtl:start-auto rtl:end-5" 
              />
            )}

            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10",
              config.bgColor
            )}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap rtl:flex-row-reverse">
                <span className={cn("font-semibold", config.color)}>
                  {isArabic ? config.labelAr : config.labelEn}
                </span>
                {log.status_before && log.status_after && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground rtl:flex-row-reverse">
                    <Badge variant="outline" className="text-xs">
                      {log.status_before}
                    </Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="text-xs">
                      {log.status_after}
                    </Badge>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                {formatDateTime(log.created_at)}
              </p>

              {/* Additional details */}
              <div className="mt-2 space-y-1 text-sm">
                {log.payment_method && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">{isArabic ? 'طريقة الدفع:' : 'Method:'}</span>{' '}
                    {getPaymentMethodLabel(log.payment_method)}
                  </p>
                )}
                {log.payment_id && (
                  <p className="text-muted-foreground font-mono text-xs truncate">
                    <span className="font-medium font-sans">{isArabic ? 'معرف الدفع:' : 'Payment ID:'}</span>{' '}
                    {log.payment_id}
                  </p>
                )}
                {log.amount && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">{isArabic ? 'المبلغ:' : 'Amount:'}</span>{' '}
                    {log.amount} SAR
                  </p>
                )}
                {log.changer_name && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">{isArabic ? 'بواسطة:' : 'By:'}</span>{' '}
                    {log.changer_name}
                  </p>
                )}
                {log.error_message && (
                  <p className="text-red-600 text-xs bg-red-500/10 rounded px-2 py-1 mt-1">
                    {log.error_message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

PaymentHistoryPanel.displayName = 'PaymentHistoryPanel';

export default PaymentHistoryPanel;
