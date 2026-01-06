import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string;
  qr_code_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  fullName: string;
  email: string;
  phone?: string;
  department: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في جلب بيانات الموظفين' : 'Failed to fetch employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isArabic]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (data: CreateEmployeeData): Promise<boolean> => {
    try {
      setActionLoading('create');
      
      const { data: result, error } = await supabase.functions.invoke('generate-employee-badge', {
        body: data,
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      toast({
        title: isArabic ? 'تم بنجاح' : 'Success',
        description: isArabic 
          ? 'تم إضافة الموظف وإرسال البطاقة بالبريد الإلكتروني'
          : 'Employee added and badge sent via email',
      });

      await fetchEmployees();
      return true;
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: error.message || (isArabic ? 'فشل في إضافة الموظف' : 'Failed to add employee'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const resendBadge = async (employeeId: string): Promise<boolean> => {
    try {
      setActionLoading(employeeId);
      
      // Get session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error(isArabic ? 'غير مصرح' : 'Unauthorized');
      }

      // Single call with proper action=resend query param
      const response = await fetch(
        `https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/generate-employee-badge?action=resend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ employeeId }),
        }
      );

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error);

      toast({
        title: isArabic ? 'تم الإرسال' : 'Sent',
        description: isArabic ? 'تم إعادة إرسال البطاقة بالبريد الإلكتروني' : 'Badge resent via email',
      });

      return true;
    } catch (error: any) {
      console.error('Error resending badge:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: error.message || (isArabic ? 'فشل في إعادة إرسال البطاقة' : 'Failed to resend badge'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (employeeId: string, isActive: boolean): Promise<boolean> => {
    try {
      setActionLoading(employeeId);
      
      const { error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: isArabic ? 'تم التحديث' : 'Updated',
        description: isActive 
          ? (isArabic ? 'تم تفعيل الموظف' : 'Employee activated')
          : (isArabic ? 'تم تعطيل الموظف' : 'Employee deactivated'),
      });

      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, is_active: isActive } : emp
      ));
      
      return true;
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تحديث الحالة' : 'Failed to update status',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
      setActionLoading(employeeId);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الحذف' : 'Deleted',
        description: isArabic ? 'تم حذف الموظف بنجاح' : 'Employee deleted successfully',
      });

      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حذف الموظف' : 'Failed to delete employee',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return {
    employees,
    loading,
    actionLoading,
    createEmployee,
    resendBadge,
    toggleActive,
    deleteEmployee,
    refetch: fetchEmployees,
  };
};
