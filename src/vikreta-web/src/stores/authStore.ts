import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Owner' | 'Manager' | 'Cashier';
  locationId: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, tenantSlug: string, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  initials: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tenantSlug: null,
      isAuthenticated: false,

      login: (user, token, tenantSlug, refreshToken) =>
        set({ user, token, refreshToken: refreshToken ?? null, tenantSlug, isAuthenticated: true }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, tenantSlug: null, isAuthenticated: false }),

      initials: () => {
        const { user } = get();
        if (!user) return '??';
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
      },
    }),
    {
      name: 'vikreta-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
