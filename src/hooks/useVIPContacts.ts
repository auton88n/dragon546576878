import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export type VIPCategory = 'influencer' | 'celebrity' | 'media' | 'government' | 'business';
export type VIPStatus = 'active' | 'invited' | 'confirmed' | 'declined' | 'attended';

export interface VIPContact {
  id: string;
  name_en: string;
  name_ar: string;
  title_en: string | null;
  title_ar: string | null;
  email: string;
  phone: string | null;
  category: VIPCategory;
  preferred_language: 'ar' | 'en';
  notes: string | null;
  status: VIPStatus;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VIPEmailLog {
  id: string;
  contact_id: string | null;
  contact_email: string;
  contact_name: string;
  template_type: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  sent_by: string | null;
  created_at: string;
  tracking_id: string | null;
  opened_at: string | null;
  open_count: number | null;
}

export interface CreateVIPContact {
  name_en: string;
  name_ar: string;
  title_en?: string;
  title_ar?: string;
  email: string;
  phone?: string;
  category: VIPCategory;
  preferred_language: 'ar' | 'en';
  notes?: string;
}

export interface UpdateVIPContact extends Partial<CreateVIPContact> {
  id: string;
  status?: VIPStatus;
}

export const useVIPContacts = () => {
  const { toast } = useToast();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const queryClient = useQueryClient();

  // Fetch all VIP contacts
  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['vip-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VIPContact[];
    },
  });

  // Fetch email logs
  const { data: emailLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['vip-email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as VIPEmailLog[];
    },
  });

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: async (contact: CreateVIPContact) => {
      const { data, error } = await supabase
        .from('vip_contacts')
        .insert(contact)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-contacts'] });
      toast({
        title: isArabic ? 'تمت الإضافة' : 'Contact Added',
        description: isArabic ? 'تمت إضافة جهة الاتصال بنجاح' : 'VIP contact added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إضافة جهة الاتصال' : 'Failed to add contact',
        variant: 'destructive',
      });
      console.error('Create contact error:', error);
    },
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateVIPContact) => {
      const { data, error } = await supabase
        .from('vip_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-contacts'] });
      toast({
        title: isArabic ? 'تم التحديث' : 'Contact Updated',
        description: isArabic ? 'تم تحديث جهة الاتصال بنجاح' : 'VIP contact updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تحديث جهة الاتصال' : 'Failed to update contact',
        variant: 'destructive',
      });
      console.error('Update contact error:', error);
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vip_contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-contacts'] });
      toast({
        title: isArabic ? 'تم الحذف' : 'Contact Deleted',
        description: isArabic ? 'تم حذف جهة الاتصال بنجاح' : 'VIP contact deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حذف جهة الاتصال' : 'Failed to delete contact',
        variant: 'destructive',
      });
      console.error('Delete contact error:', error);
    },
  });

  // Send VIP invitation
  const sendInvitation = async (params: {
    contactId?: string;
    contactEmail: string;
    contactName: string;
    preferredLanguage: 'ar' | 'en';
    templateType: string;
    subject: string;
    messageBody: string;
    offerDetails?: string;
    eventDate?: string;
    eventTime?: string;
    guestAllowance?: number;
    perks?: Array<string | { id: string; en: string; ar: string }>;
    includeVideo?: boolean;
    enableRSVP?: boolean;
  }): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-vip-invitation', {
        body: params,
      });

      if (error) throw error;

      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['vip-contacts'] });
        queryClient.invalidateQueries({ queryKey: ['vip-email-logs'] });
        return true;
      } else {
        throw new Error(data?.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Send invitation error:', error);
      throw error;
    }
  };

  return {
    contacts,
    isLoading,
    emailLogs,
    logsLoading,
    refetch,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    sendInvitation,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
