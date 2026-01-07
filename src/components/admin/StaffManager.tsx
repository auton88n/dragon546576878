import { useState, useMemo, useCallback } from 'react';
import { Users, Plus, Key, Edit2, Power, PowerOff, Eye, EyeOff, Loader2, Trash2, AlertTriangle, Upload, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/hooks/useLanguage';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
} from '@/components/ui/alert-dialog';

const StaffManager = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  const { staff, loading, actionLoading, createStaff, updatePassword, updateProfile, toggleActive, deleteStaff } = useStaff();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  // Bulk import states
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, errors: [] as string[], emailsSent: 0, emailsFailed: 0 });
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [sendSingleEmailNotification, setSendSingleEmailNotification] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Form states
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'scanner' as 'scanner' | 'manager' | 'support',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    role: 'scanner' as 'scanner' | 'manager' | 'support',
  });

  // Real-time email duplicate check
  const emailExists = useMemo(() => {
    if (!newStaff.email) return false;
    return staff.some(s => s.email.toLowerCase() === newStaff.email.toLowerCase());
  }, [newStaff.email, staff]);

  // Parse bulk input text
  const parseBulkInput = useCallback((input: string) => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        email: parts[0] || '',
        fullName: parts[1] || parts[0]?.split('@')[0] || 'Staff Member',
      };
    }).filter(entry => entry.email.includes('@'));
  }, []);

  const bulkEntries = useMemo(() => parseBulkInput(bulkInput), [bulkInput, parseBulkInput]);

  const sendCredentialsEmail = async (email: string, fullName: string, password: string, role: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('send-staff-credentials', {
        body: {
          email,
          fullName,
          password,
          role,
          language: currentLanguage,
        },
      });

      if (response.error) {
        console.error('Email sending failed:', response.error);
        return false;
      }

      return response.data?.success === true;
    } catch (error) {
      console.error('Error sending credentials email:', error);
      return false;
    }
  };

  const handleBulkImport = async () => {
    if (bulkEntries.length === 0) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'لم يتم العثور على إدخالات صالحة' : 'No valid entries found',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkImporting(true);
    setBulkProgress({ current: 0, total: bulkEntries.length, errors: [], emailsSent: 0, emailsFailed: 0 });

    const errors: string[] = [];
    let emailsSent = 0;
    let emailsFailed = 0;
    const defaultPassword = 'scan2024';

    for (let i = 0; i < bulkEntries.length; i++) {
      const entry = bulkEntries[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      const success = await createStaff({
        email: entry.email,
        password: defaultPassword,
        fullName: entry.fullName,
        phone: '',
        role: 'scanner',
      });

      if (!success) {
        errors.push(entry.email);
      } else if (sendEmailNotification) {
        // Send credentials email for successfully created staff
        const emailSent = await sendCredentialsEmail(entry.email, entry.fullName, defaultPassword, 'scanner');
        if (emailSent) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
        setBulkProgress(prev => ({ ...prev, emailsSent, emailsFailed }));
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    setBulkProgress(prev => ({ ...prev, errors, emailsSent, emailsFailed }));
    setIsBulkImporting(false);

    const addedCount = bulkEntries.length - errors.length;
    
    if (errors.length === 0) {
      let description = isArabic
        ? `تم إضافة ${addedCount} موظف`
        : `Added ${addedCount} staff members`;
      
      if (sendEmailNotification) {
        description += isArabic
          ? `. تم إرسال ${emailsSent} بريد إلكتروني`
          : `. ${emailsSent} emails sent`;
        if (emailsFailed > 0) {
          description += isArabic
            ? `، فشل ${emailsFailed}`
            : `, ${emailsFailed} failed`;
        }
      }
      
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description,
      });
      setBulkDialogOpen(false);
      setBulkInput('');
    } else {
      toast({
        title: isArabic ? 'نجاح جزئي' : 'Partial Success',
        description: isArabic
          ? `تم إضافة ${addedCount} من ${bulkEntries.length}. فشل: ${errors.join(', ')}`
          : `Added ${addedCount} of ${bulkEntries.length}. Failed: ${errors.join(', ')}`,
        variant: 'destructive',
      });
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.fullName) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (newStaff.password.length < 8) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    const success = await createStaff(newStaff);
    if (success) {
      let emailSent = false;
      
      // Send credentials email if enabled
      if (sendSingleEmailNotification) {
        setIsSendingEmail(true);
        emailSent = await sendCredentialsEmail(
          newStaff.email, 
          newStaff.fullName, 
          newStaff.password, 
          newStaff.role
        );
        setIsSendingEmail(false);
      }
      
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: sendSingleEmailNotification
          ? (emailSent 
              ? (isArabic ? 'تم إضافة الموظف وإرسال بيانات الدخول' : 'Staff added and credentials sent')
              : (isArabic ? 'تم إضافة الموظف، فشل إرسال البريد' : 'Staff added, email failed'))
          : (isArabic ? 'تم إضافة الموظف بنجاح' : 'Staff member added successfully'),
      });
      setAddDialogOpen(false);
      setNewStaff({ email: '', password: '', fullName: '', phone: '', role: 'scanner' as 'scanner' | 'manager' | 'support' });
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedStaff) return;

    if (newPassword.length < 8) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    const success = await updatePassword(selectedStaff.id, newPassword);
    if (success) {
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: isArabic ? 'تم تحديث كلمة المرور' : 'Password updated successfully',
      });
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedStaff(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedStaff) return;

    const success = await updateProfile(selectedStaff.id, editForm);
    if (success) {
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: isArabic ? 'تم تحديث البيانات' : 'Profile updated successfully',
      });
      setEditDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedStaff) return;

    const newStatus = !selectedStaff.isActive;
    const success = await toggleActive(selectedStaff.id, newStatus);
    if (success) {
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: newStatus
          ? (isArabic ? 'تم تفعيل الحساب' : 'Account activated')
          : (isArabic ? 'تم إيقاف الحساب' : 'Account deactivated'),
      });
      setToggleDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const openPasswordDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  const openEditDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditForm({
      fullName: member.fullName,
      phone: member.phone || '',
      role: member.role === 'admin' ? 'manager' : member.role as 'scanner' | 'manager' | 'support',
    });
    setEditDialogOpen(true);
  };

  const openToggleDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setToggleDialogOpen(true);
  };

  const openDeleteDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    const success = await deleteStaff(selectedStaff.id);
    if (success) {
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: isArabic ? 'تم حذف الموظف' : 'Staff member deleted',
      });
      setDeleteDialogOpen(false);
      setSelectedStaff(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-primary">{isArabic ? 'مدير' : 'Admin'}</Badge>;
      case 'manager':
        return <Badge variant="secondary">{isArabic ? 'مشرف' : 'Manager'}</Badge>;
      case 'scanner':
        return <Badge variant="outline">{isArabic ? 'ماسح' : 'Scanner'}</Badge>;
      case 'support':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">{isArabic ? 'دعم العملاء' : 'Support'}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return isArabic ? 'أبداً' : 'Never';
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className="glass-card border-accent/20">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-accent/10" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full bg-accent/10" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-foreground">
                {isArabic ? 'إدارة الموظفين' : 'Staff Management'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'إضافة وإدارة حسابات الموظفين' : 'Add and manage staff accounts'}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {isArabic ? 'إضافة موظف' : 'Add Staff'}
            </Button>
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              {isArabic ? 'إضافة عدة موظفين' : 'Bulk Import'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className={isArabic ? 'text-right' : 'text-left'}>
                    {isArabic ? 'الاسم' : 'Name'}
                  </TableHead>
                  <TableHead className={isArabic ? 'text-right' : 'text-left'}>
                    {isArabic ? 'البريد' : 'Email'}
                  </TableHead>
                  <TableHead className={isArabic ? 'text-right' : 'text-left'}>
                    {isArabic ? 'الدور' : 'Role'}
                  </TableHead>
                  <TableHead className={isArabic ? 'text-right' : 'text-left'}>
                    {isArabic ? 'الحالة' : 'Status'}
                  </TableHead>
                  <TableHead className={isArabic ? 'text-right' : 'text-left'}>
                    {isArabic ? 'آخر دخول' : 'Last Login'}
                  </TableHead>
                  <TableHead className={isArabic ? 'text-left' : 'text-right'}>
                    {isArabic ? 'الإجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isArabic ? 'لا يوجد موظفين' : 'No staff members'}
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? 'default' : 'destructive'}>
                          {member.isActive
                            ? (isArabic ? 'نشط' : 'Active')
                            : (isArabic ? 'معطل' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(member.lastLogin)}
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-1 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                          {member.role !== 'admin' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(member)}
                                title={isArabic ? 'تعديل' : 'Edit'}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPasswordDialog(member)}
                                title={isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openToggleDialog(member)}
                                title={member.isActive ? (isArabic ? 'إيقاف' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate')}
                              >
                                {member.isActive ? (
                                  <PowerOff className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Power className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(member)}
                                title={isArabic ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'إضافة موظف جديد' : 'Add New Staff Member'}</DialogTitle>
            <DialogDescription>
              {isArabic ? 'أدخل بيانات الموظف الجديد' : 'Enter the new staff member details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم الكامل' : 'Full Name'} *</Label>
              <Input
                value={newStaff.fullName}
                onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                placeholder={isArabic ? 'أدخل الاسم' : 'Enter name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'} *</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="email@example.com"
                  className={emailExists ? 'border-destructive pr-10' : ''}
                />
                {emailExists && (
                  <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              {emailExists && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {isArabic ? 'هذا البريد مسجل مسبقاً' : 'This email is already registered'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'رقم الجوال' : 'Phone'}</Label>
              <Input
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="+966..."
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'كلمة المرور' : 'Password'} *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder={isArabic ? '8 أحرف على الأقل' : 'Min 8 characters'}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'الدور' : 'Role'} *</Label>
              <Select
                value={newStaff.role}
                onValueChange={(value: 'scanner' | 'manager' | 'support') => setNewStaff({ ...newStaff, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scanner">{isArabic ? 'ماسح التذاكر' : 'Scanner'}</SelectItem>
                  <SelectItem value="manager">{isArabic ? 'مشرف' : 'Manager'}</SelectItem>
                  <SelectItem value="support">{isArabic ? 'دعم العملاء' : 'Customer Support'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Email notification checkbox */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Checkbox 
                id="sendSingleEmailNotification"
                checked={sendSingleEmailNotification}
                onCheckedChange={(checked) => setSendSingleEmailNotification(checked === true)}
                disabled={actionLoading || isSendingEmail}
              />
              <label 
                htmlFor="sendSingleEmailNotification" 
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  {isArabic 
                    ? 'إرسال بيانات الدخول بالبريد الإلكتروني' 
                    : 'Send login credentials via email'}
                </span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={actionLoading || isSendingEmail}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddStaff} disabled={actionLoading || emailExists || isSendingEmail}>
              {(actionLoading || isSendingEmail) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isSendingEmail 
                ? (isArabic ? 'جاري الإرسال...' : 'Sending...') 
                : (isArabic ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</DialogTitle>
            <DialogDescription>
              {isArabic
                ? `تغيير كلمة المرور لـ ${selectedStaff?.fullName}`
                : `Change password for ${selectedStaff?.fullName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isArabic ? '8 أحرف على الأقل' : 'Min 8 characters'}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isArabic ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdatePassword} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isArabic ? 'تحديث' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'تعديل بيانات الموظف' : 'Edit Staff Details'}</DialogTitle>
            <DialogDescription>
              {isArabic
                ? `تعديل بيانات ${selectedStaff?.fullName}`
                : `Edit details for ${selectedStaff?.fullName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم الكامل' : 'Full Name'}</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'رقم الجوال' : 'Phone'}</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'الدور' : 'Role'}</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: 'scanner' | 'manager' | 'support') => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scanner">{isArabic ? 'ماسح التذاكر' : 'Scanner'}</SelectItem>
                  <SelectItem value="manager">{isArabic ? 'مشرف' : 'Manager'}</SelectItem>
                  <SelectItem value="support">{isArabic ? 'دعم العملاء' : 'Customer Support'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdateProfile} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStaff?.isActive
                ? (isArabic ? 'إيقاف حساب الموظف' : 'Deactivate Staff Account')
                : (isArabic ? 'تفعيل حساب الموظف' : 'Activate Staff Account')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStaff?.isActive
                ? (isArabic
                    ? `هل أنت متأكد من إيقاف حساب ${selectedStaff?.fullName}؟ لن يتمكن من تسجيل الدخول.`
                    : `Are you sure you want to deactivate ${selectedStaff?.fullName}'s account? They won't be able to login.`)
                : (isArabic
                    ? `هل أنت متأكد من تفعيل حساب ${selectedStaff?.fullName}؟`
                    : `Are you sure you want to activate ${selectedStaff?.fullName}'s account?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isArabic ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Staff Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {isArabic ? 'حذف الموظف نهائياً' : 'Delete Staff Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? `هل أنت متأكد من حذف ${selectedStaff?.fullName} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to permanently delete ${selectedStaff?.fullName}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStaff} 
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
        if (!isBulkImporting) {
          setBulkDialogOpen(open);
        if (!open) {
          setBulkInput('');
          setBulkProgress({ current: 0, total: 0, errors: [], emailsSent: 0, emailsFailed: 0 });
        }
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'إضافة موظفين دفعة واحدة' : 'Bulk Import Staff'}</DialogTitle>
            <DialogDescription>
              {isArabic 
                ? 'أدخل بريد إلكتروني واسم كل موظف في سطر منفصل'
                : 'Enter staff data (email, name) - one per line'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">{isArabic ? 'طريقة الكتابة:' : 'Format:'}</p>
              <code className="text-xs block font-mono">
                email@example.com, Full Name<br/>
                another@email.com, Another Name
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                {isArabic 
                  ? 'سيتم تعيينهم كـ: ماسح تذاكر | كلمة المرور: scan2024' 
                  : 'Role: Scanner | Password: scan2024'}
              </p>
            </div>
            
            {/* Email notification checkbox */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Checkbox 
                id="sendEmailNotification"
                checked={sendEmailNotification}
                onCheckedChange={(checked) => setSendEmailNotification(checked === true)}
                disabled={isBulkImporting}
              />
              <label 
                htmlFor="sendEmailNotification" 
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  {isArabic 
                    ? 'إرسال بيانات الدخول بالبريد الإلكتروني' 
                    : 'Send login credentials via email'}
                </span>
              </label>
            </div>
            
            <Textarea
              placeholder={isArabic ? 'الصق البيانات هنا...' : 'Paste data here...'}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              disabled={isBulkImporting}
            />
            
            {isBulkImporting && (
              <div className="space-y-2">
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
                <p className="text-sm text-center text-muted-foreground">
                  {bulkProgress.current} / {bulkProgress.total}
                  {sendEmailNotification && bulkProgress.emailsSent > 0 && (
                    <span className="ms-2 text-green-600">
                      ({isArabic ? `${bulkProgress.emailsSent} بريد مرسل` : `${bulkProgress.emailsSent} emails sent`})
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'عدد الموظفين:' : 'Entries found:'} <span className="font-bold">{bulkEntries.length}</span>
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={isBulkImporting}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={isBulkImporting || bulkEntries.length === 0}
            >
              {isBulkImporting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isArabic ? 'إضافة' : 'Import'} ({bulkEntries.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffManager;
