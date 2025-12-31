import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, MailOpen, Trash2, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
}

const ContactSubmissionsPanel = () => {
  const { t, currentLanguage: language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
    },
    onError: () => {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error updating status');
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
      toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted successfully');
      setDeleteId(null);
    },
    onError: () => {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error deleting');
    },
  });

  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || '');
    
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge variant="destructive">{language === 'ar' ? 'غير مقروء' : 'Unread'}</Badge>;
      case 'read':
        return <Badge variant="secondary">{language === 'ar' ? 'مقروء' : 'Read'}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">{language === 'ar' ? 'تم الرد' : 'Resolved'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const unreadCount = submissions?.filter(s => s.status === 'unread').length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MessageSquare className="h-6 w-6 text-accent" />
          <div>
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'رسائل التواصل' : 'Contact Messages'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `${submissions?.length || 0} رسالة، ${unreadCount} غير مقروءة`
                : `${submissions?.length || 0} messages, ${unreadCount} unread`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          {submissions && submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الموضوع' : 'Subject'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow 
                    key={submission.id}
                    className={submission.status === 'unread' ? 'bg-accent/5' : ''}
                  >
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewSubmission(submission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
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
              {language === 'ar' ? 'لا توجد رسائل' : 'No messages yet'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSubmission?.status === 'unread' ? (
                <Mail className="h-5 w-5" />
              ) : (
                <MailOpen className="h-5 w-5" />
              )}
              {selectedSubmission?.subject}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'الاسم:' : 'Name:'}</span>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'البريد:' : 'Email:'}</span>
                  <p className="font-medium">{selectedSubmission.email}</p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'الهاتف:' : 'Phone:'}</span>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                  <p className="font-medium">
                    {format(new Date(selectedSubmission.created_at), 'PPpp')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الرسالة:' : 'Message:'}</span>
                <p className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>

              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'ملاحظات المدير:' : 'Admin Notes:'}
                </span>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...'}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
            <Button variant="secondary" onClick={handleSaveNotes}>
              {language === 'ar' ? 'حفظ الملاحظات' : 'Save Notes'}
            </Button>
            <Button onClick={handleMarkResolved} className="btn-gold">
              {language === 'ar' ? 'تم الرد' : 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this message? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactSubmissionsPanel;
