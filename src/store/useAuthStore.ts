import { create } from 'zustand';
import type { AuthUser } from '../types/schema.ts';

export interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const getInitialUser = (): AuthUser | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('px_auth_session');
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error('Failed to parse auth session from localStorage', e);
  }
  return null;
};

const initialUser = getInitialUser();

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: initialUser,
  isAuthenticated: !!initialUser,
  login: (user: AuthUser) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('px_auth_session', JSON.stringify(user));
      }
    } catch (e) {
      console.error('Failed to save auth session to localStorage', e);
    }
    set({ currentUser: user, isAuthenticated: true });
  },
  logout: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('px_auth_session');
      }
    } catch (e) {
      console.error('Failed to remove auth session from localStorage', e);
    }
    set({ currentUser: null, isAuthenticated: false });
  },
}));
