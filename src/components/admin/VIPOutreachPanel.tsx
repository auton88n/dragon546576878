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
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Users, Mail, History, Plus, Trash2, Edit, Send, Eye, Loader2, User, Phone, Building, Globe, CheckCircle, XCircle, Clock, MailOpen, Video, Gift, Camera, Utensils, MapPin, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

// VIP Perks - Available icons
const perkIcons = {
  MapPin: MapPin,
  Camera: Camera,
  Utensils: Utensils,
  Users: Users,
  Gift: Gift,
  Crown: Crown,
  CheckCircle: CheckCircle,
};

type PerkIconKey = keyof typeof perkIcons;

interface VIPPerk {
  id: string;
  en: string;
  ar: string;
  iconKey: PerkIconKey;
}

// Default perks
const defaultPerks: VIPPerk[] = [
  { id: 'private_tour', en: 'Private guided tour', ar: 'جولة خاصة مع مرشد', iconKey: 'MapPin' },
  { id: 'photography', en: 'Professional photography session', ar: 'جلسة تصوير احترافية', iconKey: 'Camera' },
  { id: 'dinner', en: 'Traditional Saudi hospitality dinner', ar: 'عشاء ضيافة سعودية تقليدية', iconKey: 'Utensils' },
  { id: 'vip_seating', en: 'VIP seating at cultural performances', ar: 'مقاعد VIP في العروض الثقافية', iconKey: 'Users' },
  { id: 'special_gift', en: 'Special gift from Souq Almufaijer', ar: 'هدية خاصة من سوق المفيجر', iconKey: 'Gift' },
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
  const [subjectEn, setSubjectEn] = useState('Exclusive VIP Invitation to Souq Almufaijer');
  const [subjectAr, setSubjectAr] = useState('دعوة حصرية لزيارة سوق المفيجر');
  const [messageEn, setMessageEn] = useState('We are honored to extend this exclusive invitation to experience the rich heritage of Souq Almufaijer.\n\nAs our distinguished guest, you will enjoy a personalized VIP experience showcasing our traditional crafts, authentic cuisine, and cultural performances.');
  const [messageAr, setMessageAr] = useState('يسرنا دعوتكم لتجربة التراث العريق في سوق المفيجر.\n\nكضيف مميز، ستستمتعون بتجربة استثنائية تعرض الحرف التقليدية والمأكولات الأصيلة والعروض الثقافية.');
  const [offerDetails, setOfferDetails] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // NEW: Enhanced compose state
  const [guestAllowance, setGuestAllowance] = useState<number>(2);
  const [selectedPerks, setSelectedPerks] = useState<Set<string>>(new Set(['private_tour', 'photography', 'dinner', 'vip_seating', 'special_gift']));
  const [includeVideo, setIncludeVideo] = useState(true);
  const [enableRSVP, setEnableRSVP] = useState(true);

  // Custom perks management
  const [customPerks, setCustomPerks] = useState<VIPPerk[]>(defaultPerks);
  const [showPerkDialog, setShowPerkDialog] = useState(false);
  const [editingPerk, setEditingPerk] = useState<VIPPerk | null>(null);
  const [perkForm, setPerkForm] = useState<Omit<VIPPerk, 'id'>>({ en: '', ar: '', iconKey: 'Gift' });
  const [showDeletePerkDialog, setShowDeletePerkDialog] = useState(false);
  const [deletePerkId, setDeletePerkId] = useState<string | null>(null);
  
  // AI Assist state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Perk management handlers
  const handleAddPerk = () => {
    setEditingPerk(null);
    setPerkForm({ en: '', ar: '', iconKey: 'Gift' });
    setShowPerkDialog(true);
  };

  const handleEditPerk = (perk: VIPPerk) => {
    setEditingPerk(perk);
    setPerkForm({ en: perk.en, ar: perk.ar, iconKey: perk.iconKey });
    setShowPerkDialog(true);
  };

  const handleSavePerk = () => {
    if (!perkForm.en.trim() || !perkForm.ar.trim()) {
      toast({ title: isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (editingPerk) {
      setCustomPerks(prev => prev.map(p => p.id === editingPerk.id ? { ...p, ...perkForm } : p));
      toast({ title: isArabic ? 'تم تحديث الامتياز' : 'Perk updated' });
    } else {
      const newPerk: VIPPerk = { id: `custom_${Date.now()}`, ...perkForm };
      setCustomPerks(prev => [...prev, newPerk]);
      setSelectedPerks(prev => new Set([...prev, newPerk.id]));
      toast({ title: isArabic ? 'تمت إضافة الامتياز' : 'Perk added' });
    }
    setShowPerkDialog(false);
  };

  const handleDeletePerk = (perkId: string) => {
    setDeletePerkId(perkId);
    setShowDeletePerkDialog(true);
  };

  const confirmDeletePerk = () => {
    if (deletePerkId) {
      setCustomPerks(prev => prev.filter(p => p.id !== deletePerkId));
      setSelectedPerks(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletePerkId);
        return newSet;
      });
      toast({ title: isArabic ? 'تم حذف الامتياز' : 'Perk deleted' });
    }
    setShowDeletePerkDialog(false);
    setDeletePerkId(null);
  };

  // AI Assist handler
  const handleAIAssist = async () => {
    if (selectedContacts.size === 0) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'يرجى اختيار جهة اتصال أولاً' : 'Please select a contact first',
        variant: 'destructive',
      });
      return;
    }

    // Get first selected contact
    const firstContactId = Array.from(selectedContacts)[0];
    const contact = contacts.find(c => c.id === firstContactId);
    if (!contact) return;

    setIsGeneratingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-vip-invitation', {
        body: {
          contact: {
            name: contact.preferred_language === 'ar' ? contact.name_ar : contact.name_en,
            category: contact.category,
            title: contact.preferred_language === 'ar' ? contact.title_ar : contact.title_en,
          },
          templateType,
        },
      });

      if (error) throw error;

      // Check for monthly limit error
      if (data?.error === 'monthly_limit_exceeded') {
        toast({
          title: isArabic ? 'تجاوز الحد الشهري' : 'Monthly Limit Exceeded',
          description: isArabic ? data.message_ar : data.message_en,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.message || 'AI generation failed');
      }

      // Auto-fill the form with AI-generated content
      setSubjectEn(data.subjectEn || subjectEn);
      setSubjectAr(data.subjectAr || subjectAr);
      setMessageEn(data.messageEn || messageEn);
      setMessageAr(data.messageAr || messageAr);

      // Apply suggested perks
      if (data.suggestedPerks && Array.isArray(data.suggestedPerks)) {
        const validPerks = data.suggestedPerks.filter((p: string) => 
          customPerks.some(cp => cp.id === p)
        );
        if (validPerks.length > 0) {
          setSelectedPerks(new Set(validPerks));
        }
      }

      toast({
        title: isArabic ? 'تم إنشاء المحتوى' : 'Content Generated',
        description: isArabic ? 'تم إنشاء الدعوة بواسطة الذكاء الاصطناعي' : 'AI-generated invitation ready',
      });

    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: isArabic ? 'خطأ في الاتصال' : 'Connection Error',
        description: isArabic ? 'خطأ في الاتصال، يرجى المحاولة مرة أخرى' : 'Connection error, please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

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

  // Toggle perk selection
  const togglePerkSelection = (perkId: string) => {
    const newSet = new Set(selectedPerks);
    if (newSet.has(perkId)) {
      newSet.delete(perkId);
    } else {
      newSet.add(perkId);
    }
    setSelectedPerks(newSet);
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
          // NEW: Enhanced fields
          guestAllowance,
          perks: Array.from(selectedPerks),
          includeVideo,
          enableRSVP,
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

              {/* AI Assist Button */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 border border-amber-300 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {isArabic ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      {isArabic 
                        ? 'إنشاء دعوة مخصصة تلقائياً بناءً على ملف الضيف'
                        : 'Auto-generate personalized invitation based on guest profile'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleAIAssist}
                    disabled={selectedContacts.size === 0 || isGeneratingAI}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 me-2" />
                    )}
                    {isGeneratingAI 
                      ? (isArabic ? 'جاري الإنشاء...' : 'Generating...') 
                      : (isArabic ? 'إنشاء بالذكاء الاصطناعي' : 'AI Generate')}
                  </Button>
                </div>
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
                  <Textarea value={messageEn} onChange={e => setMessageEn(e.target.value)} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'نص الرسالة (AR)' : 'Message (AR)'}</Label>
                  <Textarea value={messageAr} onChange={e => setMessageAr(e.target.value)} rows={4} dir="rtl" />
                </div>
              </div>

              {/* NEW: Guest Allowance & Toggles */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-4">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  {isArabic ? 'امتيازات VIP' : 'VIP Privileges'}
                </h3>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'عدد المرافقين المسموح' : 'Guest Allowance'}</Label>
                    <Select value={String(guestAllowance)} onValueChange={(v) => setGuestAllowance(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {isArabic ? 'ضيوف' : 'guests'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Video className="h-4 w-4 text-amber-600" />
                      {isArabic ? 'تضمين الفيديو' : 'Include Video'}
                    </Label>
                    <Switch checked={includeVideo} onCheckedChange={setIncludeVideo} />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {isArabic ? 'تفعيل تأكيد الحضور' : 'Enable RSVP'}
                    </Label>
                    <Switch checked={enableRSVP} onCheckedChange={setEnableRSVP} />
                  </div>
                </div>
              </div>

              {/* NEW: Perks Selection */}
              <div className="p-4 rounded-lg bg-white border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-600" />
                    {isArabic ? 'الامتيازات الحصرية' : 'Exclusive Perks'}
                  </Label>
                  <Button variant="outline" size="sm" onClick={handleAddPerk}>
                    <Plus className="h-3.5 w-3.5 me-1" />
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {customPerks.map(perk => {
                    const Icon = perkIcons[perk.iconKey];
                    return (
                      <div 
                        key={perk.id} 
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                          selectedPerks.has(perk.id) 
                            ? 'bg-amber-50 border-amber-300' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox 
                          checked={selectedPerks.has(perk.id)}
                          onCheckedChange={() => togglePerkSelection(perk.id)}
                        />
                        <Icon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-sm flex-1 truncate">{isArabic ? perk.ar : perk.en}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditPerk(perk)}>
                            <Edit className="h-3 w-3 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePerk(perk.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date/Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isArabic ? 'تاريخ الزيارة' : 'Event Date'}</Label>
                  <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'وقت الزيارة' : 'Event Time'}</Label>
                  <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                </div>
              </div>

              {/* Offer Details */}
              <div className="space-y-2">
                <Label>{isArabic ? 'تفاصيل إضافية (اختياري)' : 'Additional Details (optional)'}</Label>
                <Textarea 
                  value={offerDetails} 
                  onChange={e => setOfferDetails(e.target.value)} 
                  rows={2}
                  placeholder={isArabic ? 'ملاحظات خاصة للضيف...' : 'Special notes for the guest...'}
                />
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
                <>
                  {/* Engagement Funnel */}
                  {(() => {
                    const invitedCount = contacts.filter(c => c.status === 'invited' || c.status === 'confirmed' || c.status === 'attended').length;
                    const openedCount = emailLogs.filter(l => l.opened_at).length;
                    const confirmedCount = contacts.filter(c => c.status === 'confirmed' || c.status === 'attended').length;
                    const attendedCount = contacts.filter(c => c.status === 'attended').length;
                    const maxCount = Math.max(invitedCount, 1);
                    
                    const stages = [
                      { key: 'invited', label: isArabic ? 'تمت الدعوة' : 'Invited', count: invitedCount, color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700', icon: Send },
                      { key: 'opened', label: isArabic ? 'فتح البريد' : 'Opened', count: openedCount, color: 'bg-amber-500', bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: MailOpen },
                      { key: 'confirmed', label: isArabic ? 'أكد الحضور' : 'Confirmed', count: confirmedCount, color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: CheckCircle },
                      { key: 'attended', label: isArabic ? 'حضر' : 'Attended', count: attendedCount, color: 'bg-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-700', icon: Crown },
                    ];
                    
                    return (
                      <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                        <h4 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          {isArabic ? 'مسار التفاعل' : 'Engagement Funnel'}
                        </h4>
                        <div className="space-y-3">
                          {stages.map((stage, index) => {
                            const percentage = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
                            const StageIcon = stage.icon;
                            return (
                              <div key={stage.key} className="relative">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${stage.bgColor} ${stage.textColor}`}>
                                    <StageIcon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-sm font-medium ${stage.textColor}`}>{stage.label}</span>
                                      <span className={`text-sm font-bold ${stage.textColor}`}>{stage.count}</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5 text-end">{percentage}%</p>
                                  </div>
                                </div>
                                {index < stages.length - 1 && (
                                  <div className="absolute start-4 top-8 w-px h-3 bg-gray-300" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Email Tracking Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Send className="h-4 w-4 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-700">
                          {emailLogs.filter(l => l.status === 'sent').length}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600">{isArabic ? 'تم الإرسال' : 'Sent'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <MailOpen className="h-4 w-4 text-green-600" />
                        <span className="text-2xl font-bold text-green-700">
                          {emailLogs.filter(l => l.opened_at).length}
                        </span>
                      </div>
                      <p className="text-xs text-green-600">{isArabic ? 'تم الفتح' : 'Opened'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-amber-600" />
                        <span className="text-2xl font-bold text-amber-700">
                          {emailLogs.filter(l => l.status === 'sent').length > 0 
                            ? Math.round((emailLogs.filter(l => l.opened_at).length / emailLogs.filter(l => l.status === 'sent').length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-amber-600">{isArabic ? 'نسبة الفتح' : 'Open Rate'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Crown className="h-4 w-4 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-700">
                          {emailLogs.reduce((sum, l) => sum + (l.open_count || 0), 0)}
                        </span>
                      </div>
                      <p className="text-xs text-purple-600">{isArabic ? 'إجمالي الفتحات' : 'Total Opens'}</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {emailLogs.map(log => (
                        <div key={log.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                          log.opened_at 
                            ? 'bg-green-50 border-green-200 hover:border-green-300' 
                            : 'bg-white hover:bg-gray-50'
                        }`}>
                          {log.status === 'sent' && !log.opened_at && <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                          {log.status === 'sent' && log.opened_at && <MailOpen className="h-5 w-5 text-green-600 flex-shrink-0" />}
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
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200 shadow-sm">
                                    <MailOpen className="h-3.5 w-3.5" />
                                    <span>{isArabic ? 'مفتوح' : 'Opened'}</span>
                                    {(log.open_count || 0) > 1 && (
                                      <span className="bg-green-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                        ×{log.open_count}
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium">
                                      {isArabic ? '📬 تم الفتح أول مرة:' : '📬 First opened:'}
                                    </p>
                                    <p className="text-xs">
                                      {format(new Date(log.opened_at), 'PPp', { locale: isArabic ? ar : enUS })}
                                    </p>
                                    {(log.open_count || 0) > 1 && (
                                      <p className="text-xs text-green-300 mt-1">
                                        🔄 {isArabic ? `مجموع الفتحات: ${log.open_count}` : `Total opens: ${log.open_count}`}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : log.status === 'sent' ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs border border-gray-200">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{isArabic ? 'لم يُفتح بعد' : 'Not opened yet'}</span>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="text-end min-w-[120px]">
                            <Badge variant="outline" className="text-xs">{templateTypes.find(t => t.id === log.template_type)?.[isArabic ? 'ar' : 'en'] || log.template_type}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.sent_at ? format(new Date(log.sent_at), 'PP', { locale: isArabic ? ar : enUS }) : '-'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'معاينة الرسالة' : 'Email Preview'}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
            <div className="bg-white rounded shadow-lg max-w-[600px] mx-auto overflow-hidden">
              {/* Header */}
              <div className="text-center p-8" style={{ background: 'linear-gradient(135deg, #8B6F47, #5C4A32)' }}>
                <div className="h-1 w-32 mx-auto mb-4 rounded" style={{ background: 'linear-gradient(90deg, #C9A962, #E8D5A3, #C9A962)' }} />
                <h2 className="text-white text-2xl font-bold">{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h2>
                <p className="text-amber-200 mt-2">{isArabic ? '~ دعوة حصرية ~' : '~ Exclusive VIP Invitation ~'}</p>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-lg">{isArabic ? 'حضرة [الاسم] المحترم/ة،' : 'Dear [Name],'}</p>
                <div className="whitespace-pre-wrap text-gray-700">
                  {isArabic ? messageAr : messageEn}
                </div>
                
                {/* Video Preview */}
                {includeVideo && (
                  <div className="rounded-lg overflow-hidden border-2 border-amber-200">
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-8 text-center">
                      <Video className="h-12 w-12 mx-auto text-amber-600 mb-2" />
                      <p className="font-medium text-amber-800">{isArabic ? '🎬 اكتشف سحر المفيجر' : '🎬 Discover the Magic'}</p>
                      <p className="text-sm text-amber-600">{isArabic ? 'اضغط لمشاهدة الفيديو' : 'Click to watch video'}</p>
                    </div>
                  </div>
                )}

                {/* Guest Allowance */}
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#F5F1E8' }}>
                  <p className="text-amber-800 font-medium">
                    👥 {isArabic ? `يمكنكم اصطحاب حتى ${guestAllowance} ضيوف مميزين` : `You may bring up to ${guestAllowance} honored guests`}
                  </p>
                </div>

                {/* Perks Preview */}
                {selectedPerks.size > 0 && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#4A3625' }}>
                    <p className="text-amber-300 text-sm mb-3 font-medium">
                      {isArabic ? '✨ تجربتكم المميزة تتضمن' : '✨ Your VIP Experience Includes'}
                    </p>
                    <div className="space-y-2">
                      {customPerks.filter(p => selectedPerks.has(p.id)).map(perk => (
                        <div key={perk.id} className="flex items-center gap-2 text-white text-sm">
                          <CheckCircle className="h-4 w-4 text-amber-400" />
                          <span>{isArabic ? perk.ar : perk.en}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Details */}
                {(eventDate || eventTime) && (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                    <p className="text-amber-800 font-medium mb-2">📅 {isArabic ? 'تفاصيل الفعالية' : 'Event Details'}</p>
                    {eventDate && <p className="text-gray-700">{isArabic ? 'التاريخ:' : 'Date:'} {eventDate}</p>}
                    {eventTime && <p className="text-gray-700">{isArabic ? 'الوقت:' : 'Time:'} {eventTime}</p>}
                  </div>
                )}

                {/* RSVP Button */}
                {enableRSVP && (
                  <div className="text-center">
                    <div className="inline-block px-8 py-4 rounded-lg text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, #8B6F47, #5C4A32)' }}>
                      ✅ {isArabic ? 'تأكيد الحضور' : 'Accept Invitation'}
                    </div>
                  </div>
                )}

                <p className="text-gray-600">{isArabic ? 'مع أطيب التحيات،' : 'With warm regards,'}</p>
                <p className="font-semibold">{isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}</p>
              </div>
              
              {/* Footer */}
              <div className="text-center p-4" style={{ backgroundColor: '#4A3625' }}>
                <p className="text-amber-300 text-sm">{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</p>
                <p className="text-gray-400 text-xs">{isArabic ? 'قرية المفيجر التراثية | الرياض' : 'Almufaijer Heritage Village | Riyadh'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Perk Add/Edit Dialog */}
      <Dialog open={showPerkDialog} onOpenChange={setShowPerkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPerk ? (isArabic ? 'تعديل الامتياز' : 'Edit Perk') : (isArabic ? 'إضافة امتياز' : 'Add Perk')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم بالإنجليزية' : 'English Name'}</Label>
              <Input value={perkForm.en} onChange={e => setPerkForm(prev => ({ ...prev, en: e.target.value }))} placeholder="e.g., Private tour" />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم بالعربية' : 'Arabic Name'}</Label>
              <Input value={perkForm.ar} onChange={e => setPerkForm(prev => ({ ...prev, ar: e.target.value }))} placeholder="مثال: جولة خاصة" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'الأيقونة' : 'Icon'}</Label>
              <Select value={perkForm.iconKey} onValueChange={(v: PerkIconKey) => setPerkForm(prev => ({ ...prev, iconKey: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(perkIcons).map(key => {
                    const Icon = perkIcons[key as PerkIconKey];
                    return <SelectItem key={key} value={key}><div className="flex items-center gap-2"><Icon className="h-4 w-4" />{key}</div></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerkDialog(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSavePerk}>{editingPerk ? (isArabic ? 'حفظ' : 'Save') : (isArabic ? 'إضافة' : 'Add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Perk Confirmation */}
      <AlertDialog open={showDeletePerkDialog} onOpenChange={setShowDeletePerkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? 'حذف الامتياز؟' : 'Delete Perk?'}</AlertDialogTitle>
            <AlertDialogDescription>{isArabic ? 'هل أنت متأكد من حذف هذا الامتياز؟' : 'Are you sure you want to delete this perk?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePerk} className="bg-red-600 hover:bg-red-700">{isArabic ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VIPOutreachPanel;
