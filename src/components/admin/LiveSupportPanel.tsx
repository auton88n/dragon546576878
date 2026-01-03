import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { MessageCircle, User, Clock, CheckCircle, Trash2, Eye, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChatMessage {
  type: 'bot' | 'user' | 'admin';
  content: string;
  timestamp: string;
}

interface SupportConversation {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  messages: ChatMessage[];
  status: string;
  transferred_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveSupportPanelProps {
  soundEnabled?: boolean;
}

const LiveSupportPanel = ({ soundEnabled = true }: LiveSupportPanelProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const queryClient = useQueryClient();
  const { playNotification, initAudio } = useNotificationSound(soundEnabled);
  const previousCountRef = useRef<number | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['support-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        messages: (typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages) as ChatMessage[]
      })) as SupportConversation[];
    }
  });

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, [initAudio]);

  // Subscribe to realtime updates with sound notification
  useEffect(() => {
    const channel = supabase
      .channel('support-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
          // Play sound on new conversation
          playNotification();
          toast.info(isArabic ? 'محادثة جديدة!' : 'New conversation!', {
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotification, isArabic]);

  // Update conversation mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('support_conversations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
      toast.success(isArabic ? 'تم التحديث بنجاح' : 'Updated successfully');
    },
    onError: () => {
      toast.error(isArabic ? 'فشل التحديث' : 'Failed to update');
    }
  });

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_conversations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
      toast.success(isArabic ? 'تم الحذف بنجاح' : 'Deleted successfully');
      setDeleteId(null);
    },
    onError: () => {
      toast.error(isArabic ? 'فشل الحذف' : 'Failed to delete');
    }
  });

  const handleViewConversation = (conv: SupportConversation) => {
    setSelectedConversation(conv);
    setAdminNotes(conv.admin_notes || '');
    setReplyMessage('');
    setIsDialogOpen(true);
  };

  const handleSendReply = () => {
    if (!selectedConversation || !replyMessage.trim()) return;

    const newMessage: ChatMessage = {
      type: 'admin',
      content: replyMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(selectedConversation.messages || []), newMessage];

    updateMutation.mutate({
      id: selectedConversation.id,
      updates: { 
        messages: updatedMessages as unknown as SupportConversation['messages'],
        updated_at: new Date().toISOString()
      }
    });

    setSelectedConversation(prev => prev ? { ...prev, messages: updatedMessages } : null);
    setReplyMessage('');
  };

  const handleMarkResolved = () => {
    if (!selectedConversation) return;

    updateMutation.mutate({
      id: selectedConversation.id,
      updates: {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        admin_notes: adminNotes
      }
    });

    setIsDialogOpen(false);
  };

  const handleSaveNotes = () => {
    if (!selectedConversation) return;

    updateMutation.mutate({
      id: selectedConversation.id,
      updates: { admin_notes: adminNotes }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{isArabic ? 'نشط' : 'Active'}</Badge>;
      case 'transferred':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{isArabic ? 'قيد الانتظار' : 'Pending'}</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isArabic ? 'تم الحل' : 'Resolved'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingCount = conversations?.filter(c => c.status === 'transferred').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isArabic ? 'دعم العملاء المباشر' : 'Live Customer Support'}
          </h2>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة محادثات الدعم' : 'Manage support conversations'}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            {pendingCount} {isArabic ? 'قيد الانتظار' : 'pending'}
          </Badge>
        )}
      </div>

      {/* Conversations List */}
      {conversations && conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              {/* Main content */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">
                      {conv.customer_name || (isArabic ? 'زائر' : 'Visitor')}
                    </h3>
                    {getStatusBadge(conv.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.customer_email || '-'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conv.created_at), 'MMM d, yyyy h:mm a')}
                    <span className="mx-1">•</span>
                    <MessageCircle className="w-3 h-3" />
                    {conv.messages?.length || 0} {isArabic ? 'رسائل' : 'messages'}
                  </div>
                </div>
              </div>
              
              {/* Actions - separate row with proper spacing */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleViewConversation(conv)}
                >
                  <Eye className="w-4 h-4" />
                  {isArabic ? 'عرض' : 'View'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteId(conv.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary/30 rounded-xl">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? 'لا توجد محادثات دعم حتى الآن' : 'No support conversations yet'}
          </p>
        </div>
      )}

      {/* Conversation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col pt-12">
          <DialogHeader className="pe-14">
            <DialogTitle className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate">{selectedConversation?.customer_name || (isArabic ? 'زائر' : 'Visitor')}</span>
                <span className="text-sm font-normal text-muted-foreground truncate block">
                  {selectedConversation?.customer_email}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[200px] max-h-[300px]">
            {selectedConversation?.messages?.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : msg.type === 'admin'
                      ? 'bg-green-100 text-green-900 rounded-tl-sm border border-green-200'
                      : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.type === 'admin' && (
                    <span className="text-xs font-medium text-green-700 block mb-1">
                      {isArabic ? 'رد الدعم' : 'Support Reply'}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Input */}
          {selectedConversation?.status !== 'resolved' && (
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={isArabic ? 'اكتب ردك...' : 'Type your reply...'}
                className="resize-none"
                rows={2}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Admin Notes */}
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">
              {isArabic ? 'ملاحظات داخلية' : 'Internal Notes'}
            </h4>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={isArabic ? 'ملاحظات للفريق...' : 'Notes for the team...'}
              rows={2}
            />
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={handleSaveNotes}>
                {isArabic ? 'حفظ الملاحظات' : 'Save Notes'}
              </Button>
              {selectedConversation?.status !== 'resolved' && (
                <Button size="sm" onClick={handleMarkResolved} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 me-1" />
                  {isArabic ? 'تم الحل' : 'Mark Resolved'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? 'هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this conversation? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LiveSupportPanel;
