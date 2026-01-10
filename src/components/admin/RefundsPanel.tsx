import React, { useState, useEffect, forwardRef } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  AlertTriangle, Search, Undo2, RefreshCw, 
  Users, DollarSign, CheckCircle, XCircle, Mail, Link, CreditCard, Copy, Eye 
} from 'lucide-react';
import { generateRefundApologyPreview } from '@/lib/emailPreviewTemplates';
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

interface OrphanPayment {
  id: string;
  status: string;
  amount: number;
  amountFormat: string;
  description: string;
  createdAt: string;
  source: { type: string; company?: string; number?: string } | null;
  isLinked: boolean;
  linkedBookingRef: string | null;
}

const RefundsPanel = forwardRef<HTMLDivElement>((_, ref) => {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isArabic = currentLanguage === 'ar';
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

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

  // Orphan payments state
  const [orphanPayments, setOrphanPayments] = useState<OrphanPayment[]>([]);
  const [loadingOrphans, setLoadingOrphans] = useState(false);
  const [orphanDateFrom, setOrphanDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [orphanDateTo, setOrphanDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Link orphan payment state
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    payment: OrphanPayment;
  } | null>(null);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [linkingPayment, setLinkingPayment] = useState<string | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');

  // Orphan refund state
  const [orphanRefundDialog, setOrphanRefundDialog] = useState<{
    open: boolean;
    payment: OrphanPayment;
  } | null>(null);
  const [orphanRefundAmount, setOrphanRefundAmount] = useState('');
  const [orphanRefundEmail, setOrphanRefundEmail] = useState('');
  const [orphanRefundReason, setOrphanRefundReason] = useState('');
  const [processingOrphanRefund, setProcessingOrphanRefund] = useState(false);
  const [showRefundEmailPreview, setShowRefundEmailPreview] = useState(false);

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
    setCancellingBookingId(bookingId);
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
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إلغاء الحجز' : 'Failed to cancel booking',
        variant: 'destructive',
      });
    } finally {
      setCancellingBookingId(null);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isArabic ? ar : enUS });
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'PP p', { locale: isArabic ? ar : enUS });
  };

  // Fetch orphan payments from Moyasar
  const fetchOrphanPayments = async () => {
    setLoadingOrphans(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-moyasar-payments', {
        body: { 
          dateFrom: orphanDateFrom,
          dateTo: orphanDateTo,
        }
      });
      if (error) throw error;
      // Filter to only show paid but unlinked payments
      const orphans = (data.payments || []).filter((p: OrphanPayment) => p.status === 'paid' && !p.isLinked);
      setOrphanPayments(orphans);
    } catch (err) {
      console.error('Error fetching orphan payments:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في جلب المدفوعات' : 'Failed to fetch payments',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrphans(false);
    }
  };

  // Fetch pending bookings for linking
  const fetchPendingBookings = async (payment: OrphanPayment) => {
    setLoadingPending(true);
    setPendingBookings([]);
    try {
      // Fetch pending bookings with matching amount
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_reference, customer_name, customer_email, visit_date, total_amount, created_at')
        .eq('payment_status', 'pending')
        .is('payment_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Sort by amount match first, then by date
      const sorted = (data || []).sort((a, b) => {
        const aMatch = a.total_amount === payment.amount ? 1 : 0;
        const bMatch = b.total_amount === payment.amount ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setPendingBookings(sorted);
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Open link dialog
  const handleOpenLinkDialog = (payment: OrphanPayment) => {
    setLinkDialog({ open: true, payment });
    setBookingSearch('');
    fetchPendingBookings(payment);
  };

  // Link payment to booking
  const handleLinkToBooking = async (bookingId: string) => {
    if (!linkDialog) return;
    setLinkingPayment(bookingId);
    try {
      const { data, error } = await supabase.functions.invoke('link-orphan-payment', {
        body: { bookingId, paymentId: linkDialog.payment.id }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast({
        title: isArabic ? 'تم الربط' : 'Linked Successfully',
        description: isArabic ? 'تم ربط الدفع وإنشاء التذاكر' : 'Payment linked and tickets generated!',
      });
      
      setLinkDialog(null);
      // Remove from orphans list
      setOrphanPayments(prev => prev.filter(p => p.id !== linkDialog.payment.id));
      fetchDuplicates();
    } catch (err: any) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: err.message || (isArabic ? 'فشل الربط' : 'Failed to link payment'),
        variant: 'destructive',
      });
    } finally {
      setLinkingPayment(null);
    }
  };

  // Filter pending bookings by search
  const filteredPendingBookings = pendingBookings.filter(b => {
    if (!bookingSearch) return true;
    const search = bookingSearch.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(search) ||
      b.customer_name.toLowerCase().includes(search) ||
      b.customer_email.toLowerCase().includes(search)
    );
  });

  // Open orphan refund dialog
  const handleOpenOrphanRefundDialog = (payment: OrphanPayment) => {
    setOrphanRefundDialog({ open: true, payment });
    setOrphanRefundAmount(String(payment.amount));
    setOrphanRefundEmail('');
    setOrphanRefundReason('');
  };

  // Process orphan payment refund
  const handleProcessOrphanRefund = async () => {
    if (!orphanRefundDialog) return;
    setProcessingOrphanRefund(true);
    try {
      const amountInHalalas = Math.round(parseFloat(orphanRefundAmount) * 100);
      const { data, error } = await supabase.functions.invoke('refund-orphan-payment', {
        body: {
          paymentId: orphanRefundDialog.payment.id,
          amount: amountInHalalas,
          customerEmail: orphanRefundEmail.trim() || undefined,
          reason: orphanRefundReason.trim() || undefined,
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: isArabic ? 'تم الاسترداد' : 'Refund Processed',
        description: isArabic ? `تم استرداد ${data.refundedAmount} ر.س` : `Refunded ${data.refundedAmount} SAR`,
      });

      setOrphanRefundDialog(null);
      setOrphanPayments(prev => prev.filter(p => p.id !== orphanRefundDialog.payment.id));
      fetchRefundLogs();
    } catch (err: any) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: err.message || (isArabic ? 'فشل الاسترداد' : 'Failed to process refund'),
        variant: 'destructive',
      });
    } finally {
      setProcessingOrphanRefund(false);
    }
  };

  return (
    <div ref={ref} className="space-y-6">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="duplicates" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{isArabic ? 'مكررة' : 'Duplicates'}</span>
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="ms-1 text-xs">{duplicates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orphans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{isArabic ? 'مفقودة' : 'Orphans'}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">{isArabic ? 'السجل' : 'History'}</span>
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
                              disabled={cancellingBookingId === booking.id}
                            >
                              {cancellingBookingId === booking.id ? (
                                <RefreshCw className="h-3 w-3 me-1 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3 me-1" />
                              )}
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

        {/* Orphan Payments Tab */}
        <TabsContent value="orphans" className="mt-4">
          <Card className="glass-card-gold border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-amber-500" />
                {isArabic ? 'مدفوعات غير مرتبطة' : 'Orphan Payments'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isArabic 
                  ? 'مدفوعات ناجحة في Moyasar لم يتم ربطها بحجز' 
                  : 'Paid payments in Moyasar not linked to any booking'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Input
                  type="date"
                  value={orphanDateFrom}
                  onChange={(e) => setOrphanDateFrom(e.target.value)}
                  className="w-auto"
                />
                <Input
                  type="date"
                  value={orphanDateTo}
                  onChange={(e) => setOrphanDateTo(e.target.value)}
                  className="w-auto"
                />
                <Button onClick={fetchOrphanPayments} disabled={loadingOrphans} className="gap-2">
                  {loadingOrphans ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isArabic ? 'بحث' : 'Search'}
                </Button>
              </div>

              {loadingOrphans ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : orphanPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>{isArabic ? 'لا توجد مدفوعات غير مرتبطة' : 'No orphan payments found'}</p>
                  <p className="text-xs mt-1">{isArabic ? 'اضغط على بحث لفحص Moyasar' : 'Click Search to check Moyasar'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-600 font-medium">
                      {orphanPayments.length} {isArabic ? 'مدفوعات غير مرتبطة' : 'unlinked payments found'}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={fetchOrphanPayments} 
                      disabled={loadingOrphans}
                      className="gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingOrphans ? 'animate-spin' : ''}`} />
                      {isArabic ? 'تحديث' : 'Refresh'}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isArabic ? 'معرف الدفع' : 'Payment ID'}</TableHead>
                        <TableHead>{isArabic ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{isArabic ? 'الوصف' : 'Description'}</TableHead>
                        <TableHead>{isArabic ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orphanPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <span>{payment.id.slice(0, 12)}...</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(payment.id);
                                  toast({
                                    title: isArabic ? 'تم النسخ' : 'Copied',
                                    description: payment.id,
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{payment.amount} SAR</TableCell>
                          <TableCell className="text-sm" title={payment.description || '-'}>
                            <span className="line-clamp-2">{payment.description || '-'}</span>
                          </TableCell>
                          <TableCell className="text-sm">{formatDateTime(payment.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleOpenLinkDialog(payment)} className="gap-1">
                                <Link className="h-3 w-3" />
                                {isArabic ? 'ربط' : 'Link'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleOpenOrphanRefundDialog(payment)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Undo2 className="h-3 w-3" />
                                {isArabic ? 'استرداد' : 'Refund'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      {/* Link Payment Dialog */}
      <AlertDialog open={linkDialog?.open} onOpenChange={(open) => !open && setLinkDialog(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'ربط الدفع بحجز' : 'Link Payment to Booking'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? `المبلغ: ${linkDialog?.payment.amount} ر.س - اختر الحجز للربط`
                : `Amount: ${linkDialog?.payment.amount} SAR - Select a booking to link`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <Input
              placeholder={isArabic ? 'بحث بالاسم أو البريد أو رقم الحجز...' : 'Search by name, email, or reference...'}
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
            
            {loadingPending ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredPendingBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {isArabic ? 'لا توجد حجوزات معلقة' : 'No pending bookings found'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {filteredPendingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{booking.booking_reference}</Badge>
                        <Badge variant={booking.total_amount === linkDialog?.payment.amount ? 'default' : 'secondary'}>
                          {booking.total_amount} SAR
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLinkToBooking(booking.id)}
                      disabled={linkingPayment === booking.id}
                    >
                      {linkingPayment === booking.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Link className="h-3 w-3 me-1" />
                          {isArabic ? 'ربط' : 'Link'}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Orphan Refund Dialog */}
      <AlertDialog open={orphanRefundDialog?.open} onOpenChange={(open) => !open && setOrphanRefundDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? 'استرداد دفعة مفقودة' : 'Refund Orphan Payment'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? `معرف الدفع: ${orphanRefundDialog?.payment.id.slice(0, 12)}...` 
                : `Payment ID: ${orphanRefundDialog?.payment.id.slice(0, 12)}...`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {/* Customer Email */}
            <div>
              <label className="text-sm font-medium">
                {isArabic ? 'البريد الإلكتروني للعميل' : 'Customer Email'}
              </label>
              <Input
                type="email"
                value={orphanRefundEmail}
                onChange={(e) => setOrphanRefundEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isArabic ? 'سيتم إرسال إشعار اعتذار للعميل' : 'An apology notification will be sent'}
              </p>
            </div>

            {/* Refund Amount */}
            <div>
              <label className="text-sm font-medium">
                {isArabic ? 'مبلغ الاسترداد (ر.س)' : 'Refund Amount (SAR)'}
              </label>
              <Input
                type="number"
                value={orphanRefundAmount}
                onChange={(e) => setOrphanRefundAmount(e.target.value)}
                max={orphanRefundDialog?.payment.amount}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isArabic ? 'الحد الأقصى:' : 'Max:'} {orphanRefundDialog?.payment.amount} SAR
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium">
                {isArabic ? 'سبب الاسترداد (اختياري)' : 'Reason (optional)'}
              </label>
              <Input
                value={orphanRefundReason}
                onChange={(e) => setOrphanRefundReason(e.target.value)}
                placeholder={isArabic ? 'مثال: دفعة مكررة' : 'e.g. Duplicate payment'}
                className="mt-1"
              />
            </div>

            {/* Preview Email Button */}
            {orphanRefundEmail.trim() && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRefundEmailPreview(true)}
                className="w-full gap-2"
              >
                <Eye className="h-4 w-4" />
                {isArabic ? 'معاينة البريد' : 'Preview Email'}
              </Button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessOrphanRefund} disabled={processingOrphanRefund} className="bg-destructive hover:bg-destructive/90">
              {processingOrphanRefund ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : null}
              {isArabic ? 'تأكيد الاسترداد' : 'Confirm Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Email Preview Dialog */}
      <AlertDialog open={showRefundEmailPreview} onOpenChange={setShowRefundEmailPreview}>
        <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {isArabic ? 'معاينة بريد الاعتذار' : 'Refund Apology Email Preview'}
            </AlertDialogTitle>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant={isArabic ? "outline" : "default"}
                onClick={() => {/* Toggle handled by isArabic */}}
                disabled
              >
                English
              </Button>
              <Button
                size="sm"
                variant={isArabic ? "default" : "outline"}
                onClick={() => {/* Toggle handled by isArabic */}}
                disabled
              >
                العربية
              </Button>
            </div>
          </AlertDialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-muted/30">
            <iframe
              srcDoc={generateRefundApologyPreview(
                parseFloat(orphanRefundAmount) || orphanRefundDialog?.payment.amount || 0,
                orphanRefundDialog?.payment.id || 'SAMPLE_PAYMENT_ID',
                orphanRefundReason.trim() || undefined,
                isArabic
              )}
              className="w-full h-[500px] border-0"
              title="Email Preview"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إغلاق' : 'Close'}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

RefundsPanel.displayName = 'RefundsPanel';

export default RefundsPanel;
