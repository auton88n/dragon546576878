import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'admin' | 'scanner' | 'manager' | 'support';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
}

interface CreateStaffData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'scanner' | 'manager' | 'support';
}

interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  role?: 'scanner' | 'manager' | 'support';
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchStaff = useCallback(async () => {
    try {
      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const staffList: StaffMember[] = (profiles || [])
        .map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);
          if (!userRole) return null; // Skip users without roles (not staff)
          
          return {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            phone: profile.phone,
            role: userRole.role as 'admin' | 'scanner' | 'manager' | 'support',
            isActive: profile.is_active ?? true,
            lastLogin: profile.last_login,
            createdAt: profile.created_at,
          };
        })
        .filter((s): s is StaffMember => s !== null);

      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const createStaff = async (data: CreateStaffData): Promise<boolean> => {
    setActionLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return false;
      }

      const response = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'create',
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          role: data.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create staff');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await fetchStaff();
      return true;
    } catch (error) {
      console.error('Create staff error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create staff';
      // Provide user-friendly messages for common errors
      let friendlyMessage = errorMessage;
      if (errorMessage.toLowerCase().includes('email already exists')) {
        friendlyMessage = 'This email is already registered. Please use a different email address.';
      }
      toast({
        title: 'Error',
        description: friendlyMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updatePassword = async (userId: string, password: string): Promise<boolean> => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'update-password',
          userId,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update password');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return true;
    } catch (error) {
      console.error('Update password error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateProfile = async (userId: string, data: UpdateProfileData): Promise<boolean> => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'update-profile',
          userId,
          ...data,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update profile');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await fetchStaff();
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean): Promise<boolean> => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'toggle-active',
          userId,
          isActive,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update status');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await fetchStaff();
      return true;
    } catch (error) {
      console.error('Toggle active error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteStaff = async (userId: string): Promise<boolean> => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete staff');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await fetchStaff();
      return true;
    } catch (error) {
      console.error('Delete staff error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete staff',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    staff,
    loading,
    actionLoading,
    createStaff,
    updatePassword,
    updateProfile,
    toggleActive,
    deleteStaff,
    refetch: fetchStaff,
  };
}
