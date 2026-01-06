import { useState } from 'react';
import { Users, Plus, QrCode, Mail, ToggleLeft, ToggleRight, Trash2, Loader2, Download, Eye } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useEmployees, type CreateEmployeeData, type Employee } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import EmployeeQRDialog from './EmployeeQRDialog';

const departments = [
  { value: 'security', labelAr: 'الأمن', labelEn: 'Security' },
  { value: 'cleaning', labelAr: 'النظافة', labelEn: 'Cleaning' },
  { value: 'guide', labelAr: 'الإرشاد', labelEn: 'Guide' },
  { value: 'cafe', labelAr: 'المقهى', labelEn: 'Café' },
  { value: 'shop', labelAr: 'المتجر', labelEn: 'Shop' },
  { value: 'maintenance', labelAr: 'الصيانة', labelEn: 'Maintenance' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

const EmployeesManager = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { employees, loading, actionLoading, createEmployee, resendBadge, toggleActive, deleteEmployee } = useEmployees();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    fullName: '',
    email: '',
    phone: '',
    department: 'general',
  });

  const handleAddEmployee = async () => {
    if (!formData.fullName || !formData.email || !formData.department) return;
    
    const success = await createEmployee(formData);
    if (success) {
      setShowAddDialog(false);
      setFormData({ fullName: '', email: '', phone: '', department: 'general' });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEmployee(id);
    setShowDeleteConfirm(null);
  };

  const getDepartmentLabel = (dept: string) => {
    const found = departments.find(d => d.value === dept);
    return found ? (isArabic ? found.labelAr : found.labelEn) : dept;
  };

  if (loading) {
    return (
      <Card className="glass-card border-accent/20">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-accent/10" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full bg-accent/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card border-accent/20">
        <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-violet-500/5 to-transparent rtl:bg-gradient-to-l p-4 md:p-6">
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-violet-600" />
              </div>
              <div className="text-start rtl:text-right">
                <CardTitle className="text-foreground text-base md:text-lg">
                  {isArabic ? 'الموظفين' : 'Employees'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isArabic ? 'إدارة بطاقات الموظفين' : 'Manage employee badges'}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? 'إضافة موظف' : 'Add Employee'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{isArabic ? 'لا يوجد موظفين بعد' : 'No employees yet'}</p>
              <p className="text-sm mt-1">{isArabic ? 'أضف موظفاً جديداً للبدء' : 'Add an employee to get started'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map(employee => (
                <div
                  key={employee.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors',
                    employee.is_active 
                      ? 'bg-card border-border/50 hover:border-violet-500/30' 
                      : 'bg-muted/50 border-border/30 opacity-70'
                  )}
                >
                  <div className="flex items-center gap-3 rtl:flex-row-reverse">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
                      employee.is_active ? 'bg-violet-600' : 'bg-muted-foreground'
                    )}>
                      {employee.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-start rtl:text-right">
                      <p className="font-medium text-foreground">{employee.full_name}</p>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap rtl:flex-row-reverse">
                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-700 border-violet-500/20">
                      {getDepartmentLabel(employee.department)}
                    </Badge>
                    <Badge variant={employee.is_active ? 'default' : 'outline'} className={employee.is_active ? 'bg-success text-success-foreground' : ''}>
                      {employee.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                    </Badge>
                    
                    <div className="flex items-center gap-1 ms-auto sm:ms-2">
                      {employee.qr_code_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedEmployee(employee)}
                          className="h-8 w-8 text-violet-600 hover:bg-violet-500/10"
                          title={isArabic ? 'عرض QR' : 'View QR'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resendBadge(employee.id)}
                        disabled={actionLoading === employee.id || !employee.qr_code_url}
                        className="h-8 w-8 text-blue-600 hover:bg-blue-500/10"
                        title={isArabic ? 'إعادة إرسال البريد' : 'Resend Email'}
                      >
                        {actionLoading === employee.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(employee.id, !employee.is_active)}
                        disabled={actionLoading === employee.id}
                        className={cn('h-8 w-8', employee.is_active ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10')}
                        title={employee.is_active ? (isArabic ? 'تعطيل' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate')}
                      >
                        {employee.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(employee.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title={isArabic ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <Users className="h-5 w-5 text-violet-600" />
              {isArabic ? 'إضافة موظف جديد' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? 'سيتلقى الموظف بطاقة QR عبر البريد الإلكتروني'
                : 'The employee will receive a QR badge via email'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم الكامل' : 'Full Name'} *</Label>
              <Input
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder={isArabic ? 'أحمد محمد' : 'Ahmed Mohammed'}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'} *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="employee@example.com"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{isArabic ? 'رقم الهاتف' : 'Phone'}</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+966 5xxxxxxxx"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{isArabic ? 'القسم' : 'Department'} *</Label>
              <Select 
                value={formData.department} 
                onValueChange={val => setFormData(prev => ({ ...prev, department: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {isArabic ? dept.labelAr : dept.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddEmployee} 
              disabled={!formData.fullName || !formData.email || actionLoading === 'create'}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {actionLoading === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isArabic ? 'إضافة وإرسال البطاقة' : 'Add & Send Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? 'هل أنت متأكد من حذف هذا الموظف؟ لن يتمكن من استخدام بطاقته بعد الآن.'
                : 'Are you sure you want to delete this employee? Their badge will no longer work.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      {selectedEmployee && (
        <EmployeeQRDialog 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)} 
        />
      )}
    </>
  );
};

export default EmployeesManager;
