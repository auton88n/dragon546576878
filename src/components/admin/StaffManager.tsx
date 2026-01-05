import { useState } from 'react';
import { Users, Plus, Key, Edit2, Power, PowerOff, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const { staff, loading, actionLoading, createStaff, updatePassword, updateProfile, toggleActive } = useStaff();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

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
      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: isArabic ? 'تم إضافة الموظف بنجاح' : 'Staff member added successfully',
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
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isArabic ? 'إضافة موظف' : 'Add Staff'}
          </Button>
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
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="email@example.com"
              />
              {staff.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'البريد المستخدم: ' : 'Existing: '}
                  {staff.map(s => s.email).join(', ')}
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddStaff} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isArabic ? 'إضافة' : 'Add'}
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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
    </>
  );
};

export default StaffManager;
