import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Trash2, 
  Search, 
  Building2, 
  Users, 
  Calendar, 
  Mail, 
  Phone,
  RefreshCw,
  FileText
} from 'lucide-react';

interface GroupBookingRequest {
  id: string;
  organization_name: string;
  contact_person: string;
  email: string;
  phone: string;
  group_size: number;
  preferred_dates: string[];
  group_type: string;
  special_requirements: string | null;
  status: string;
  admin_notes: string | null;
  quoted_amount: number | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  contacted: 'bg-blue-100 text-blue-800 border-blue-200',
  quoted: 'bg-purple-100 text-purple-800 border-purple-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  contacted: { en: 'Contacted', ar: 'تم التواصل' },
  quoted: { en: 'Quoted', ar: 'تم عرض السعر' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

const groupTypeLabels: Record<string, { en: string; ar: string }> = {
  corporate: { en: 'Corporate Team Building', ar: 'بناء فرق الشركات' },
  school: { en: 'School/Educational', ar: 'مدرسي / تعليمي' },
  wedding: { en: 'Wedding/Private Event', ar: 'حفل زفاف / مناسبة خاصة' },
  conference: { en: 'Conference/Business Event', ar: 'مؤتمر / حدث تجاري' },
  other: { en: 'Other', ar: 'أخرى' },
};

interface CreateInvoiceData {
  clientType: 'company';
  companyName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  numAdults: number;
  visitDate: string | null;
  quotedAmount: number | null;
  groupRequestId: string;
}

interface GroupBookingsPanelProps {
  onCreateInvoice?: (data: CreateInvoiceData) => void;
}

const GroupBookingsPanel = ({ onCreateInvoice }: GroupBookingsPanelProps = {}) => {
  const { isRTL, currentLanguage, t } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [requests, setRequests] = useState<GroupBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<GroupBookingRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Edit state
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editQuotedAmount, setEditQuotedAmount] = useState('');

  const handleCreateInvoice = (request: GroupBookingRequest) => {
    if (!onCreateInvoice) return;
    
    const firstPreferredDate = request.preferred_dates[0] || null;
    
    onCreateInvoice({
      clientType: 'company',
      companyName: request.organization_name,
      clientName: request.contact_person,
      clientEmail: request.email,
      clientPhone: request.phone,
      numAdults: request.group_size,
      visitDate: firstPreferredDate,
      quotedAmount: request.quoted_amount,
      groupRequestId: request.id,
    });
    
    setIsDialogOpen(false);
    toast.success(isArabic ? 'تم نقل البيانات إلى نموذج الفاتورة' : 'Data transferred to invoice form');
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse preferred_dates from JSONB
      const parsedData = (data || []).map(item => ({
        ...item,
        preferred_dates: Array.isArray(item.preferred_dates) 
          ? item.preferred_dates as string[]
          : [],
      }));
      
      setRequests(parsedData);
    } catch (error) {
      console.error('Error fetching group booking requests:', error);
      toast.error(isArabic ? 'فشل تحميل الطلبات' : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleViewDetails = (request: GroupBookingRequest) => {
    setSelectedRequest(request);
    setEditStatus(request.status);
    setEditNotes(request.admin_notes || '');
    setEditQuotedAmount(request.quoted_amount?.toString() || '');
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('group_booking_requests')
        .update({
          status: editStatus,
          admin_notes: editNotes || null,
          quoted_amount: editQuotedAmount ? parseFloat(editQuotedAmount) : null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(isArabic ? 'تم تحديث الطلب' : 'Request updated');
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(isArabic ? 'فشل تحديث الطلب' : 'Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('group_booking_requests')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success(isArabic ? 'تم حذف الطلب' : 'Request deleted');
      setDeleteId(null);
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error(isArabic ? 'فشل حذف الطلب' : 'Failed to delete request');
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {t('admin.corporate.title')}
          </h2>
          <Badge variant="secondary">{requests.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="w-4 h-4 me-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? 'بحث عن المنظمة أو الشخص...' : 'Search organization or contact...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={isArabic ? 'فلتر الحالة' : 'Filter by status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
            {Object.entries(statusLabels).map(([value, labels]) => (
              <SelectItem key={value} value={value}>
                {isArabic ? labels.ar : labels.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('admin.corporate.noRequests')}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.corporate.organization')}</TableHead>
                <TableHead>{t('admin.corporate.contactPerson')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('admin.corporate.groupSize')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('admin.corporate.groupType')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.date')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.organization_name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{request.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{request.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {request.group_size}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {isArabic 
                      ? groupTypeLabels[request.group_type]?.ar || request.group_type
                      : groupTypeLabels[request.group_type]?.en || request.group_type}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status] || 'bg-gray-100'}>
                      {isArabic 
                        ? statusLabels[request.status]?.ar || request.status
                        : statusLabels[request.status]?.en || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {format(new Date(request.created_at), 'PP', { locale: isArabic ? ar : enUS })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(request.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('admin.corporate.requestDetails')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Organization Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('admin.corporate.organization')}
                  </Label>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {selectedRequest.organization_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('admin.corporate.contactPerson')}
                  </Label>
                  <p className="font-medium">{selectedRequest.contact_person}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('common.email')}
                  </Label>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedRequest.email}`} className="text-primary hover:underline">
                      {selectedRequest.email}
                    </a>
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('common.phone')}
                  </Label>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedRequest.phone}`} className="text-primary hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </p>
                </div>
              </div>

              <hr />

              {/* Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('admin.corporate.groupSize')}
                  </Label>
                  <p className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {selectedRequest.group_size} {t('admin.corporate.people')}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('admin.corporate.groupType')}
                  </Label>
                  <p className="font-medium">
                    {isArabic 
                      ? groupTypeLabels[selectedRequest.group_type]?.ar || selectedRequest.group_type
                      : groupTypeLabels[selectedRequest.group_type]?.en || selectedRequest.group_type}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  {t('admin.corporate.preferredDates')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.preferred_dates.map((date, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(date), 'PP', { locale: isArabic ? ar : enUS })}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedRequest.special_requirements && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('admin.corporate.specialRequirements')}
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedRequest.special_requirements}
                  </p>
                </div>
              )}

              <hr />

              {/* Admin Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('common.status')}</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, labels]) => (
                          <SelectItem key={value} value={value}>
                            {isArabic ? labels.ar : labels.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.corporate.quotedAmount')} ({t('common.currency')})</Label>
                    <Input
                      type="number"
                      value={editQuotedAmount}
                      onChange={(e) => setEditQuotedAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('admin.messages.adminNotes')}</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={isArabic ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...'}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={updating} className="flex-1 btn-gold">
                    {updating 
                      ? t('common.loading')
                      : t('common.save')}
                  </Button>
                  {onCreateInvoice && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateInvoice(selectedRequest)}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {isArabic ? 'إنشاء فاتورة' : 'Create Invoice'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.messages.confirmDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.messages.deleteMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupBookingsPanel;
