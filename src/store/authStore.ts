import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type ViewType = 'login' | 'register' | 'profile' | 'legal' | 'legal-doc' | 'delete-account' | 'delete-success' | 'forgot-password';

interface AuthState {
  user: User | null;
  profile: any | null;
  isUserModalOpen: boolean;
  userModalView: ViewType;
  activeLegalDoc: string;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  openUserModal: (view?: ViewType) => void;
  closeUserModal: () => void;
  setModalView: (view: ViewType) => void;
  setLegalDoc: (doc: string) => void;
  logout: () => Promise<void>;
  fetchProfile: (userId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isUserModalOpen: false,
  userModalView: 'login',
  activeLegalDoc: '',
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  openUserModal: (view) => set({ isUserModalOpen: true, userModalView: view || (get().user ? 'profile' : 'login') }),
  closeUserModal: () => set({ isUserModalOpen: false }),
  setModalView: (view) => set({ userModalView: view }),
  setLegalDoc: (doc) => set({ activeLegalDoc: doc, userModalView: 'legal-doc' }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isUserModalOpen: false });
    // Import useCartStore at the top or dynamically, wait, it's better to dynamically import to avoid circular dep just in case
    const { useCartStore } = await import('./cartStore');
    useCartStore.getState().clearCart();
  },
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      set({ user: data.user });
      let profileData = null;
      for (let i = 0; i < 3; i++) {
        const { data: pData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (pData) {
          profileData = pData;
          break;
        }
        await new Promise(res => setTimeout(res, 500));
      }
      if (profileData) set({ profile: profileData });
    }
  },
  fetchProfile: async (userId?: string) => {
    const resolvedId = userId || get().user?.id;
    if (resolvedId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', resolvedId)
        .single();
      if (data) set({ profile: data });
    }
  }
}));

// Initialize auth listener
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.getState().setUser(session?.user || null);
  if (session?.user) {
    useAuthStore.getState().fetchProfile();
  } else {
    useAuthStore.getState().setProfile(null);
  }
});
