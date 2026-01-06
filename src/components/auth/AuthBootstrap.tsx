import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { AppRole } from '@/types';

/**
 * AuthBootstrap - Initializes auth state from Supabase session on app load.
 * This ensures that after a page refresh, the auth store is re-hydrated
 * from the persisted Supabase session in localStorage.
 * 
 * Must be rendered inside BrowserRouter.
 */
const AuthBootstrap = () => {
  const { setUser, setSession, setProfile, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    // Fetch user role from database
    const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
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
    };

    // Fetch user profile from database
    const fetchUserProfile = async (userId: string) => {
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
    };

    // Set up auth state listener FIRST (prevents missing events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state updates only
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlock
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

    // THEN check for existing session (re-hydrate from localStorage)
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
  }, [setUser, setSession, setProfile, setRole, setLoading]);

  // This component doesn't render anything
  return null;
};

export default AuthBootstrap;
