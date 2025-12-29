import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { AppRole } from '@/types';

export function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated,
    setUser,
    setSession,
    setProfile,
    setRole,
    setLoading,
    reset,
    isAdmin,
    isScanner,
    isManager,
    isStaff,
  } = useAuthStore();

  // Fetch user role from database
  const fetchUserRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role as AppRole | null;
  }, []);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile and role fetching with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            const [userRole, userProfile] = await Promise.all([
              fetchUserRole(session.user.id),
              fetchUserProfile(session.user.id),
            ]);
            setRole(userRole);
            setProfile(userProfile);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchUserProfile(session.user.id),
        ]).then(([userRole, userProfile]) => {
          setRole(userRole);
          setProfile(userProfile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole, fetchUserProfile, setUser, setSession, setRole, setProfile, setLoading]);

  // Sign in with email and password
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      // Check if user has a role (staff only)
      const userRole = await fetchUserRole(data.user.id);
      if (!userRole) {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'Unauthorized: Staff access only' } };
      }

      return { data, error: null };
    },
    [fetchUserRole, setLoading]
  );

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  }, [navigate, reset]);

  return {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated,
    isAdmin,
    isScanner,
    isManager,
    isStaff,
    signIn,
    signOut,
  };
}
