import { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useVIPContacts, VIPContact, VIPCategory, VIPStatus, CreateVIPContact } from '@/hooks/useVIPContacts';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Users, Mail, History, Plus, Trash2, Edit, Send, Eye, Loader2, User, Phone, Building, Globe, CheckCircle, XCircle, Clock, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// Category labels
const categoryLabels: Record<VIPCategory, { en: string; ar: string }> = {
  influencer: { en: 'Influencer', ar: 'مؤثر' },
  celebrity: { en: 'Celebrity', ar: 'شخصية مشهورة' },
  media: { en: 'Media', ar: 'إعلامي' },
  government: { en: 'Government', ar: 'مسؤول حكومي' },
  business: { en: 'Business', ar: 'رائد أعمال' },
};

// Status labels
const statusLabels: Record<VIPStatus, { en: string; ar: string; color: string }> = {
  active: { en: 'Active', ar: 'نشط', color: 'bg-gray-500' },
  invited: { en: 'Invited', ar: 'تمت الدعوة', color: 'bg-blue-500' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد الحضور', color: 'bg-green-500' },
  declined: { en: 'Declined', ar: 'اعتذر', color: 'bg-red-500' },
  attended: { en: 'Attended', ar: 'حضر', color: 'bg-amber-500' },
};

// Template types
const templateTypes = [
  { id: 'exclusive_invitation', en: 'Exclusive Invitation', ar: 'دعوة حصرية' },
  { id: 'media_tour', en: 'Media Tour', ar: 'جولة إعلامية' },
  { id: 'partnership', en: 'Partnership Proposal', ar: 'عرض شراكة' },
  { id: 'vip_experience', en: 'VIP Experience', ar: 'تجربة استثنائية' },
  { id: 'thank_you', en: 'Thank You', ar: 'شكر وتقدير' },
];

// Empty contact form
const emptyContact: CreateVIPContact = {
  name_en: '',
  name_ar: '',
  title_en: '',
  title_ar: '',
  email: '',
  phone: '',
  category: 'celebrity',
  preferred_language: 'ar',
  notes: '',
};

export const VIPOutreachPanel = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  
  const { 
    contacts, 
    isLoading, 
    emailLogs, 
    logsLoading,
    createContact, 
    updateContact, 
    deleteContact,
    sendInvitation,
    isCreating,
    isUpdating,
    isDeleting
  } = useVIPContacts();

  // State
  const [activeTab, setActiveTab] = useState('contacts');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<VIPContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateVIPContact>(emptyContact);
  const [categoryFilter, setCategoryFilter] = useState<VIPCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VIPStatus | 'all'>('all');

  // Compose state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [templateType, setTemplateType] = useState('exclusive_invitation');
  const [subjectEn, setSubjectEn] = useState('Exclusive Invitation to Souq Almufaijer');
  const [subjectAr, setSubjectAr] = useState('دعوة حصرية لزيارة سوق المفيجر');
  const [messageEn, setMessageEn] = useState('We are honored to invite you to experience the rich heritage of Souq Almufaijer.\n\nAs a distinguished guest, you will enjoy a private guided tour showcasing our traditional crafts, authentic cuisine, and cultural performances.');
  const [messageAr, setMessageAr] = useState('يسرنا دعوتكم لتجربة التراث العريق في سوق المفيجر.\n\nكضيف مميز، ستستمتعون بجولة خاصة تعرض الحرف التقليدية والمأكولات الأصيلة والعروض الثقافية.');
  const [offerDetails, setOfferDetails] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [contacts, categoryFilter, statusFilter]);

  // Handle form change
  const handleFormChange = (field: keyof CreateVIPContact, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Open add dialog
  const openAddDialog = () => {
    setFormData(emptyContact);
    setEditingContact(null);
    setShowAddDialog(true);
  };

  // Open edit dialog
  const openEditDialog = (contact: VIPContact) => {
    setFormData({
      name_en: contact.name_en,
      name_ar: contact.name_ar,
      title_en: contact.title_en || '',
      title_ar: contact.title_ar || '',
      email: contact.email,
      phone: contact.phone || '',
      category: contact.category,
      preferred_language: contact.preferred_language,
      notes: contact.notes || '',
    });
    setEditingContact(contact);
    setShowAddDialog(true);
  };

  // Handle save contact
  const handleSaveContact = async () => {
    if (!formData.name_en || !formData.name_ar || !formData.email) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingContact) {
        await updateContact({ id: editingContact.id, ...formData });
      } else {
        await createContact(formData);
      }
      setShowAddDialog(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteContactId) return;
    try {
      await deleteContact(deleteContactId);
      setShowDeleteDialog(false);
      setDeleteContactId(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Toggle contact selection
  const toggleContactSelection = (id: string) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedContacts(newSet);
  };

  // Select all filtered
  const selectAllFiltered = () => {
    const newSet = new Set(filteredContacts.map(c => c.id));
    setSelectedContacts(newSet);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  // Send invitations
  const handleSendInvitations = async () => {
    if (selectedContacts.size === 0) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'يرجى اختيار جهات الاتصال' : 'Please select contacts',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const contactId of selectedContacts) {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) continue;

      try {
        const isContactArabic = contact.preferred_language === 'ar';
        await sendInvitation({
          contactId: contact.id,
          contactEmail: contact.email,
          contactName: isContactArabic ? contact.name_ar : contact.name_en,
          preferredLanguage: contact.preferred_language,
          templateType,
          subject: isContactArabic ? subjectAr : subjectEn,
          messageBody: isContactArabic ? messageAr : messageEn,
          offerDetails: offerDetails || undefined,
          eventDate: eventDate || undefined,
          eventTime: eventTime || undefined,
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to send to ${contact.email}:`, error);
      }
    }

    setIsSending(false);
    
    const message = isArabic 
      ? `تم الإرسال: ${successCount} ناجح، ${failCount} فشل`
      : `Sent: ${successCount} successful, ${failCount} failed`;
    
    if (failCount === 0) {
      toast({ title: isArabic ? 'تم الإرسال' : 'Sent', description: message });
    } else {
      toast({ title: isArabic ? 'اكتمل' : 'Completed', description: message, variant: 'destructive' });
    }
    
    clearSelection();
    setActiveTab('history');
  };

  // Render loading
  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Crown className="h-5 w-5" />
            {isArabic ? 'الدعوات الخاصة' : 'VIP Outreach'}
          </CardTitle>
          <CardDescription className="text-amber-700">
            {isArabic 
              ? 'إدارة الشخصيات المهمة وإرسال دعوات احترافية'
              : 'Manage VIP contacts and send professional invitations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{isArabic ? 'جهات الاتصال' : 'Contacts'}</span>
              </TabsTrigger>
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">{isArabic ? 'كتابة رسالة' : 'Compose'}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">{isArabic ? 'سجل الإرسال' : 'History'}</span>
              </TabsTrigger>
            </TabsList>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <Button onClick={openAddDialog} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 me-2" />
                  {isArabic ? 'إضافة جهة اتصال' : 'Add Contact'}
                </Button>
                
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as VIPCategory | 'all')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={isArabic ? 'الفئة' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VIPStatus | 'all')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isArabic ? 'لا توجد جهات اتصال' : 'No contacts found'}</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredContacts.map(contact => (
                      <div 
                        key={contact.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox 
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => toggleContactSelection(contact.id)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {isArabic ? contact.name_ar : contact.name_en}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {isArabic ? categoryLabels[contact.category].ar : categoryLabels[contact.category].en}
                            </Badge>
                            <Badge className={`text-xs text-white ${statusLabels[contact.status].color}`}>
                              {isArabic ? statusLabels[contact.status].ar : statusLabels[contact.status].en}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => { setDeleteContactId(contact.id); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {selectedContacts.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-100 rounded-lg">
                  <span className="text-sm font-medium">
                    {isArabic ? `${selectedContacts.size} محدد` : `${selectedContacts.size} selected`}
                  </span>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    {isArabic ? 'إلغاء التحديد' : 'Clear'}
                  </Button>
                  <Button size="sm" className="bg-amber-600" onClick={() => setActiveTab('compose')}>
                    <Mail className="h-4 w-4 me-2" />
                    {isArabic ? 'كتابة رسالة' : 'Compose'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Compose Tab */}
            <TabsContent value="compose" className="space-y-6">
              {/* Recipients */}
              <div className="p-4 rounded-lg bg-white border">
                <Label className="text-sm font-medium mb-2 block">
                  {isArabic ? 'المستلمون' : 'Recipients'} ({selectedContacts.size})
                </Label>
                {selectedContacts.size === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'يرجى اختيار جهات الاتصال من التبويب السابق' : 'Please select contacts from the Contacts tab'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedContacts).map(id => {
                      const contact = contacts.find(c => c.id === id);
                      if (!contact) return null;
                      return (
                        <Badge key={id} variant="secondary" className="flex items-center gap-1">
                          {isArabic ? contact.name_ar : contact.name_en}
                          <button onClick={() => toggleContactSelection(id)} className="ml-1 hover:text-red-600">×</button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label>{isArabic ? 'القالب' : 'Template'}</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{isArabic ? t.ar : t.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isArabic ? 'عنوان الرسالة (EN)' : 'Subject (EN)'}</Label>
                  <Input value={subjectEn} onChange={e => setSubjectEn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'عنوان الرسالة (AR)' : 'Subject (AR)'}</Label>
                  <Input value={subjectAr} onChange={e => setSubjectAr(e.target.value)} dir="rtl" />
                </div>
              </div>

              {/* Message */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isArabic ? 'نص الرسالة (EN)' : 'Message (EN)'}</Label>
                  <Textarea value={messageEn} onChange={e => setMessageEn(e.target.value)} rows={5} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'نص الرسالة (AR)' : 'Message (AR)'}</Label>
                  <Textarea value={messageAr} onChange={e => setMessageAr(e.target.value)} rows={5} dir="rtl" />
                </div>
              </div>

              {/* Offer Details */}
              <div className="space-y-2">
                <Label>{isArabic ? 'تفاصيل العرض الخاص (اختياري)' : 'Offer Details (optional)'}</Label>
                <Textarea 
                  value={offerDetails} 
                  onChange={e => setOfferDetails(e.target.value)} 
                  rows={2}
                  placeholder={isArabic ? 'جولة خاصة مع مرشد...' : 'Private guided tour...'}
                />
              </div>

              {/* Date/Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isArabic ? 'تاريخ الزيارة (اختياري)' : 'Event Date (optional)'}</Label>
                  <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'وقت الزيارة (اختياري)' : 'Event Time (optional)'}</Label>
                  <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 me-2" />
                  {isArabic ? 'معاينة' : 'Preview'}
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleSendInvitations}
                  disabled={selectedContacts.size === 0 || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 me-2" />
                  )}
                  {isArabic ? `إرسال (${selectedContacts.size})` : `Send (${selectedContacts.size})`}
                </Button>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isArabic ? 'لا يوجد سجل إرسال' : 'No send history'}</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {emailLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-4 p-4 rounded-lg border bg-white">
                        {log.status === 'sent' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                        {log.status === 'failed' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                        {log.status === 'pending' && <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{log.contact_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{log.contact_email}</p>
                        </div>

                        {/* Email Open Status */}
                        <div className="flex items-center gap-2">
                          {log.opened_at ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                  <MailOpen className="h-3.5 w-3.5" />
                                  <span>{isArabic ? 'مفتوح' : 'Opened'}</span>
                                  {(log.open_count || 0) > 1 && (
                                    <span className="bg-green-600 text-white px-1.5 rounded-full text-[10px]">
                                      ×{log.open_count}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">
                                  {isArabic ? 'تم الفتح: ' : 'Opened: '}
                                  {format(new Date(log.opened_at), 'PPp', { locale: isArabic ? ar : enUS })}
                                </p>
                                {(log.open_count || 0) > 1 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {isArabic ? `عدد مرات الفتح: ${log.open_count}` : `Opened ${log.open_count} times`}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ) : log.status === 'sent' ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{isArabic ? 'لم يُفتح' : 'Not opened'}</span>
                            </div>
                          ) : null}
                        </div>
                        
                        <div className="text-end min-w-[120px]">
                          <Badge variant="outline">{templateTypes.find(t => t.id === log.template_type)?.[isArabic ? 'ar' : 'en'] || log.template_type}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.sent_at ? format(new Date(log.sent_at), 'PPp', { locale: isArabic ? ar : enUS }) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact 
                ? (isArabic ? 'تعديل جهة الاتصال' : 'Edit Contact')
                : (isArabic ? 'إضافة جهة اتصال' : 'Add Contact')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (EN) *' : 'Name (EN) *'}</Label>
                <Input 
                  value={formData.name_en} 
                  onChange={e => handleFormChange('name_en', e.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (AR) *' : 'Name (AR) *'}</Label>
                <Input 
                  value={formData.name_ar} 
                  onChange={e => handleFormChange('name_ar', e.target.value)}
                  placeholder="الاسم الكامل"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isArabic ? 'المسمى الوظيفي (EN)' : 'Title (EN)'}</Label>
                <Input 
                  value={formData.title_en || ''} 
                  onChange={e => handleFormChange('title_en', e.target.value)}
                  placeholder="Actor, Influencer, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'المسمى الوظيفي (AR)' : 'Title (AR)'}</Label>
                <Input 
                  value={formData.title_ar || ''} 
                  onChange={e => handleFormChange('title_ar', e.target.value)}
                  placeholder="ممثل، مؤثر، إلخ"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isArabic ? 'البريد الإلكتروني *' : 'Email *'}</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => handleFormChange('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'رقم الجوال' : 'Phone'}</Label>
                <Input 
                  value={formData.phone || ''} 
                  onChange={e => handleFormChange('phone', e.target.value)}
                  placeholder="+966..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                <Select value={formData.category} onValueChange={v => handleFormChange('category', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'اللغة المفضلة' : 'Preferred Language'}</Label>
                <Select value={formData.preferred_language} onValueChange={v => handleFormChange('preferred_language', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{isArabic ? 'العربية' : 'Arabic'}</SelectItem>
                    <SelectItem value="en">{isArabic ? 'الإنجليزية' : 'English'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea 
                value={formData.notes || ''} 
                onChange={e => handleFormChange('notes', e.target.value)}
                rows={3}
                placeholder={isArabic ? 'ملاحظات خاصة...' : 'Private notes...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveContact} disabled={isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? 'هل أنت متأكد من حذف جهة الاتصال هذه؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this contact? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'معاينة الرسالة' : 'Email Preview'}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
            <div className="bg-white rounded shadow-lg max-w-[600px] mx-auto p-6">
              <div className="text-center mb-6 p-6 rounded-lg" style={{ background: 'linear-gradient(135deg, #8B6F47, #5C4A32)' }}>
                <h2 className="text-white text-2xl font-bold">{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h2>
                <p className="text-amber-200 mt-2">{isArabic ? '~ دعوة خاصة ~' : '~ Special Invitation ~'}</p>
              </div>
              <p className="text-lg mb-4">{isArabic ? 'حضرة [الاسم] المحترم/ة،' : 'Dear [Name],'}</p>
              <div className="whitespace-pre-wrap text-gray-700 mb-6">
                {isArabic ? messageAr : messageEn}
              </div>
              {(offerDetails || eventDate) && (
                <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#4A3625' }}>
                  {eventDate && <p className="text-white mb-1"><strong>{isArabic ? 'التاريخ:' : 'Date:'}</strong> {eventDate}</p>}
                  {eventTime && <p className="text-white mb-2"><strong>{isArabic ? 'الوقت:' : 'Time:'}</strong> {eventTime}</p>}
                  {offerDetails && <p className="text-gray-200">{offerDetails}</p>}
                </div>
              )}
              <p className="text-gray-600">{isArabic ? 'مع أطيب التحيات،' : 'With warm regards,'}</p>
              <p className="font-semibold">{isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VIPOutreachPanel;
