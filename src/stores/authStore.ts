import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, AppRole } from '@/types';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRole: (role: AppRole | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  
  // Role checks
  isAdmin: () => boolean;
  isScanner: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setSession: (session) => set({ session }),
  
  setProfile: (profile) => set({ profile }),
  
  setRole: (role) => set({ role }),
  
  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
    }),

  isAdmin: () => get().role === 'admin',
  
  isScanner: () => get().role === 'scanner',
  
  isManager: () => get().role === 'manager',
  
  isStaff: () => !!get().role,
}));
