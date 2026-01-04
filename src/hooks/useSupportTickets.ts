import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface SupportTicket {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  ayn_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  subject: string;
  category: string;
  priority: string;
  description: string;
}

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (error: any) {
      console.error('Failed to fetch support tickets:', error);
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async (data: CreateTicketData): Promise<boolean> => {
    try {
      setSubmitting(true);

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const adminName = profile?.full_name || user.email || 'Admin';
      const adminEmail = profile?.email || user.email || '';

      const ticketId = crypto.randomUUID();

      // Call edge function to create ticket and send emails
      const { data: result, error } = await supabase.functions.invoke('send-ayn-support', {
        body: {
          ticketId,
          adminId: user.id,
          adminEmail,
          adminName,
          subject: data.subject,
          category: data.category,
          priority: data.priority,
          description: data.description,
        },
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Failed to create ticket');

      toast({
        title: t('admin.support.ticketCreated', { id: result.ticketRef }),
        description: t('admin.support.confirmationSent'),
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      console.error('Failed to create support ticket:', error);
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTicket = async (ticketId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: t('admin.support.ticketDeleted'),
        description: t('admin.support.ticketDeletedDesc'),
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      console.error('Failed to delete support ticket:', error);
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: t('admin.support.statusUpdated'),
        description: t('admin.support.statusUpdatedDesc'),
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      console.error('Failed to update ticket status:', error);
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    tickets,
    loading,
    submitting,
    createTicket,
    deleteTicket,
    updateTicketStatus,
    refetch: fetchTickets,
  };
}
