import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  AlertTriangle, Search, Undo2, RefreshCw, 
  Users, DollarSign, CheckCircle, XCircle, Mail 
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DuplicateGroup {
  customer_email: string;
  customer_name: string;
  visit_date: string;
  bookings: {
    id: string;
    booking_reference: string;
    total_amount: number;
    payment_status: string;
    payment_id: string | null;
    created_at: string;
  }[];
}

interface RefundLog {
  id: string;
  booking_id: string;
  booking_reference: string;
  customer_email: string;
  amount: number;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

const RefundsPanel = () => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';

  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [refundLogs, setRefundLogs] = useState<RefundLog[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DuplicateGroup | null>(null);
  
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    bookingId: string;
    bookingRef: string;
    amount: number;
    paymentId: string;
  } | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDuplicates();
    fetchRefundLogs();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_reference, customer_email, customer_name, visit_date, total_amount, payment_status, payment_id, created_at')
        .eq('payment_status', 'pending')
        .order('customer_email')
        .order('visit_date');

      if (error) throw error;

      const groups: Record<string, DuplicateGroup> = {};
      (data || []).forEach((booking) => {
        const key = `${booking.customer_email}|${booking.visit_date}`;
        if (!groups[key]) {
          groups[key] = {
            customer_email: booking.customer_email,
            customer_name: booking.customer_name,
            visit_date: booking.visit_date,
            bookings: []
          };
        }
        groups[key].bookings.push({
          id: booking.id,
          booking_reference: booking.booking_reference,
          total_amount: booking.total_amount,
          payment_status: booking.payment_status,
          payment_id: booking.payment_id,
          created_at: booking.created_at || ''
        });
      });

      const duplicateGroups = Object.values(groups).filter(g => g.bookings.length >= 2);
      setDuplicates(duplicateGroups);
    } catch (err) {
      console.error('Error fetching duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('id, booking_id, amount, metadata, created_at, bookings!inner(booking_reference, customer_email)')
        .eq('event_type', 'refund')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const logs: RefundLog[] = (data || []).map((log) => ({
        id: log.id,
        booking_id: log.booking_id || '',
        booking_reference: (log.bookings as { booking_reference: string })?.booking_reference || '',
        customer_email: (log.bookings as { customer_email: string })?.customer_email || '',
        amount: log.amount || 0,
        status: (log.metadata as Record<string, unknown>)?.status as string || 'unknown',
        created_at: log.created_at,
        metadata: log.metadata as Record<string, unknown> || {}
      }));
      setRefundLogs(logs);
    } catch (err) {
      console.error('Error fetching refund logs:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResults(null);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_reference, customer_email, customer_name, visit_date, total_amount, payment_status, payment_id, created_at')
        .ilike('customer_email', `%${searchEmail.trim()}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchResults({
          customer_email: data[0].customer_email,
          customer_name: data[0].customer_name,
          visit_date: '',
          bookings: data.map(b => ({
            id: b.id,
            booking_reference: b.booking_reference,
            total_amount: b.total_amount,
            payment_status: b.payment_status,
            payment_id: b.payment_id,
            created_at: b.created_at || ''
          }))
        });
      } else {
        toast({
          title: isArabic ? 'لا توجد نتائج' : 'No Results',
          description: isArabic ? 'لم يتم العثور على حجوزات لهذا البريد' : 'No bookings found for this email',
        });
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundDialog) return;
    setProcessing(true);

    try {
      const amountInHalalas = Math.round(parseFloat(refundAmount) * 100);
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          bookingId: refundDialog.bookingId,
          amount: amountInHalalas,
          reason: 'Admin refund from Refund Center',
          sendEmail: true
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: isArabic ? 'تم الاسترداد' : 'Refund Processed',
        description: isArabic ? 'تم استرداد المبلغ بنجاح' : 'Refund processed successfully',
      });

      setRefundDialog(null);
      fetchRefundLogs();
      fetchDuplicates();
    } catch (err) {
      console.error('Refund error:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في معالجة الاسترداد' : 'Failed to process refund',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelDuplicate = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الإلغاء' : 'Cancelled',
        description: isArabic ? 'تم إلغاء الحجز المكرر' : 'Duplicate booking cancelled',
      });
      fetchDuplicates();
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isArabic ? ar : enUS });
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'PP p', { locale: isArabic ? ar : enUS });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isArabic ? 'مركز الاسترداد' : 'Refund Center'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'إدارة الحجوزات المكررة والاستردادات' : 'Manage duplicate bookings and refunds'}
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card className="glass-card-gold border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            {isArabic ? 'البحث عن عميل' : 'Search Customer'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder={isArabic ? 'البريد الإلكتروني...' : 'Email address...'}
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching} className="gap-2">
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isArabic ? 'بحث' : 'Search'}
            </Button>
          </div>

          {searchResults && (
            <div className="mt-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{searchResults.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{searchResults.customer_email}</p>
                </div>
                <Badge>{searchResults.bookings.length} {isArabic ? 'حجز' : 'bookings'}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? 'رقم الحجز' : 'Reference'}</TableHead>
                    <TableHead>{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{isArabic ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">{booking.booking_reference}</TableCell>
                      <TableCell>{booking.total_amount} SAR</TableCell>
                      <TableCell>
                        <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                          {booking.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(booking.created_at)}</TableCell>
                      <TableCell>
                        {booking.payment_status === 'completed' && booking.payment_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRefundAmount(String(booking.total_amount));
                              setRefundDialog({
                                open: true,
                                bookingId: booking.id,
                                bookingRef: booking.booking_reference,
                                amount: booking.total_amount,
                                paymentId: booking.payment_id || ''
                              });
                            }}
                          >
                            <Undo2 className="h-3 w-3 me-1" />
                            {isArabic ? 'استرداد' : 'Refund'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inner Tabs */}
      <Tabs defaultValue="duplicates">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="duplicates" className="gap-2">
            <Users className="h-4 w-4" />
            {isArabic ? 'مكررة' : 'Duplicates'}
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="ms-1 text-xs">{duplicates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Undo2 className="h-4 w-4" />
            {isArabic ? 'السجل' : 'History'}
          </TabsTrigger>
        </TabsList>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="mt-4">
          <Card className="glass-card-gold border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {isArabic ? 'حجوزات معلقة مكررة' : 'Potential Duplicate Bookings'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isArabic 
                  ? 'عملاء لديهم أكثر من حجز معلق لنفس التاريخ' 
                  : 'Customers with multiple pending bookings for the same date'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : duplicates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>{isArabic ? 'لا توجد حجوزات مكررة' : 'No duplicate bookings found'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((group, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{group.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{group.customer_email}</p>
                          <p className="text-xs text-amber-600 mt-1">
                            {isArabic ? 'تاريخ الزيارة:' : 'Visit:'} {formatDate(group.visit_date)}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">{group.bookings.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {group.bookings.map((booking, bIdx) => (
                          <div key={booking.id} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs">{booking.booking_reference}</span>
                              <span className="text-muted-foreground">{booking.total_amount} SAR</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelDuplicate(booking.id)}
                            >
                              <XCircle className="h-3 w-3 me-1" />
                              {isArabic ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="glass-card-gold border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Undo2 className="h-4 w-4" />
                {isArabic ? 'سجل الاستردادات' : 'Refund History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {refundLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{isArabic ? 'لا توجد استردادات سابقة' : 'No refunds recorded yet'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? 'رقم الحجز' : 'Reference'}</TableHead>
                      <TableHead>{isArabic ? 'العميل' : 'Customer'}</TableHead>
                      <TableHead>{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{isArabic ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.booking_reference}</TableCell>
                        <TableCell className="text-sm">{log.customer_email}</TableCell>
                        <TableCell>{(log.amount / 100).toFixed(2)} SAR</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDateTime(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <AlertDialog open={refundDialog?.open} onOpenChange={(open) => !open && setRefundDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? 'تأكيد الاسترداد' : 'Confirm Refund'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? `هل تريد استرداد المبلغ للحجز ${refundDialog?.bookingRef}?` 
                : `Are you sure you want to refund booking ${refundDialog?.bookingRef}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              {isArabic ? 'مبلغ الاسترداد (ر.س)' : 'Refund Amount (SAR)'}
            </label>
            <Input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={refundDialog?.amount}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isArabic ? 'الحد الأقصى:' : 'Max:'} {refundDialog?.amount} SAR
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessRefund} disabled={processing}>
              {processing ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : null}
              {isArabic ? 'تأكيد الاسترداد' : 'Confirm Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RefundsPanel;
