import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface StalledPayment {
  id: string;
  booking_id: string;
  created_at: string;
  amount: number | null;
  metadata: {
    error_type?: string;
    requires_admin_review?: boolean;
  } | null;
}

const StalledPaymentsAlert = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [stalledPayments, setStalledPayments] = useState<StalledPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStalledPayments = async () => {
    setLoading(true);
    try {
      // Get stalled payments from the last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('payment_logs')
        .select('id, booking_id, created_at, amount, metadata')
        .eq('event_type', 'payment_stalled')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setStalledPayments(data as StalledPayment[]);
      }
    } catch (err) {
      console.error('Error fetching stalled payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStalledPayments();
  }, []);

  // Real-time subscription for new stalled payments
  useEffect(() => {
    const channel = supabase
      .channel('stalled-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_logs',
          filter: 'event_type=eq.payment_stalled',
        },
        (payload) => {
          console.log('New stalled payment detected:', payload);
          setStalledPayments((prev) => [payload.new as StalledPayment, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || stalledPayments.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 border-amber-500 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
        {isArabic ? 'مدفوعات معلقة تحتاج مراجعة' : 'Stalled Payments Need Review'}
        <Badge variant="secondary" className="bg-amber-200 text-amber-800">
          {stalledPayments.length}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStalledPayments}
          className="ml-auto h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          {stalledPayments.slice(0, 3).map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between text-sm bg-background/50 rounded px-2 py-1"
            >
              <span className="font-mono text-xs">
                {payment.booking_id?.slice(0, 8)}...
              </span>
              <span className="text-muted-foreground">
                {payment.amount ? `${payment.amount} SAR` : '-'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(payment.created_at), {
                  addSuffix: true,
                  locale: isArabic ? ar : enUS,
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => window.open(`/admin?tab=refunds&search=${payment.booking_id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {stalledPayments.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              {isArabic 
                ? `+${stalledPayments.length - 3} مدفوعات أخرى` 
                : `+${stalledPayments.length - 3} more payments`}
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default StalledPaymentsAlert;
