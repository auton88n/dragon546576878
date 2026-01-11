import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, MailOpen, Trash2, MessageSquare, Eye, Send, CheckCircle2, Loader2, Sparkles, Gift, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
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
import { toast } from 'sonner';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reply_sent?: boolean;
  reply_message?: string | null;
  reply_sent_at?: string | null;
}

const ContactSubmissionsPanel = () => {
  const { t, currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [showCompensationDialog, setShowCompensationDialog] = useState(false);
  const [isSendingCompensation, setIsSendingCompensation] = useState(false);
  const [compensationData, setCompensationData] = useState({
    adultCount: 1,
    childCount: 0,
    visitDate: '',
    visitTime: '10:00',
    reason: '',
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['contact-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactSubmission[];
    },
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('contact-submissions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_submissions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: { status: string; admin_notes?: string } = { status };
      if (notes !== undefined) updateData.admin_notes = notes;

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      toast.success(t('admin.settings.saved'));
    },
    onError: () => {
      toast.error(t('errors.generic'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      toast.success(isArabic ? 'تم الحذف' : 'Deleted successfully');
      setDeleteId(null);
    },
    onError: () => {
      toast.error(t('errors.generic'));
    },
  });

  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || '');
    setReplyMessage('');
    
    // Mark as read if unread
    if (submission.status === 'unread') {
      updateStatusMutation.mutate({ id: submission.id, status: 'read' });
    }
  };

  const handleSaveNotes = () => {
    if (selectedSubmission) {
      updateStatusMutation.mutate({
        id: selectedSubmission.id,
        status: selectedSubmission.status === 'unread' ? 'read' : selectedSubmission.status,
        notes: adminNotes,
      });
      setSelectedSubmission(null);
    }
  };

  const handleMarkResolved = () => {
    if (selectedSubmission) {
      updateStatusMutation.mutate({
        id: selectedSubmission.id,
        status: 'resolved',
        notes: adminNotes,
      });
      setSelectedSubmission(null);
    }
  };

  const handleSendReply = async () => {
    if (!selectedSubmission || !replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          submissionId: selectedSubmission.id,
          replyMessage: replyMessage.trim(),
        },
      });

      if (error) throw error;

      toast.success(t('admin.messages.replySuccess'));
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(t('admin.messages.replyFailed'));
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status: string, replySent?: boolean) => {
    if (replySent) {
      return (
        <Badge className="bg-green-500 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('admin.messages.replySent')}
        </Badge>
      );
    }
    switch (status) {
      case 'unread':
        return <Badge variant="destructive">{t('admin.messages.unread')}</Badge>;
      case 'read':
        return <Badge variant="secondary">{t('admin.messages.read')}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">{t('admin.messages.resolved')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const unreadCount = submissions?.filter(s => s.status === 'unread').length || 0;

  if (isLoading) {
    return (
      <Card className="glass-card-gold border-0">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-gold border-0">
      <CardHeader className="border-b border-border/50 p-3 sm:p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg rtl:flex-row-reverse rtl:justify-end">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-gold flex items-center justify-center">
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
          </div>
          <span className="text-foreground">
            {t('admin.messages.title')}
          </span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ms-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">

        {submissions && submissions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('admin.messages.subject')}</TableHead>
                <TableHead>{t('admin.messages.date')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow 
                  key={submission.id}
                  className={submission.status === 'unread' ? 'bg-accent/5' : ''}
                >
                  <TableCell>{getStatusBadge(submission.status, submission.reply_sent)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{submission.name}</p>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {submission.subject}
                  </TableCell>
                  <TableCell>
                    {format(new Date(submission.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 hover:bg-secondary"
                        onClick={() => handleViewSubmission(submission)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(submission.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t('admin.messages.noMessages')}</p>
          </div>
        )}
      </CardContent>

      {/* View Submission Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl pt-10 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pe-12">
            <DialogTitle className="flex items-center gap-3">
              <div className="shrink-0">
                {selectedSubmission?.status === 'unread' ? (
                  <Mail className="h-5 w-5" />
                ) : (
                  <MailOpen className="h-5 w-5" />
                )}
              </div>
              <span className="truncate">{selectedSubmission?.subject}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('common.name')}:</span>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('common.email')}:</span>
                  <p className="font-medium">{selectedSubmission.email}</p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <span className="text-muted-foreground">{t('common.phone')}:</span>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('common.date')}:</span>
                  <p className="font-medium">
                    {format(new Date(selectedSubmission.created_at), 'PPpp')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground">{isArabic ? 'الرسالة:' : 'Message:'}</span>
                <p className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>

              {/* Reply Section */}
              <div className="border-t pt-4">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  {t('admin.messages.replyToCustomer')}:
                </span>
                
                {selectedSubmission.reply_sent ? (
                  <div className="mt-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t('admin.messages.replySent')}</span>
                      {selectedSubmission.reply_sent_at && (
                        <span className="text-muted-foreground">
                          • {t('admin.messages.sentOn')} {format(new Date(selectedSubmission.reply_sent_at), 'PPpp')}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{selectedSubmission.reply_message}</p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder={t('admin.messages.replyPlaceholder')}
                      className="mt-2"
                      rows={4}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || isSendingReply}
                      className="mt-2 btn-gold"
                    >
                      {isSendingReply ? (
                        <>
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          {t('admin.messages.sendingReply')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 me-2" />
                          {t('admin.messages.sendReply')}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  {t('admin.messages.adminNotes')}:
                </span>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={isArabic ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...'}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
              {t('common.close')}
            </Button>
            <Button variant="secondary" onClick={handleSaveNotes}>
              {t('admin.messages.saveNotes')}
            </Button>
            <Button onClick={handleMarkResolved} className="btn-gold">
              {t('admin.messages.markResolved')}
            </Button>
          </DialogFooter>
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
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ContactSubmissionsPanel;
