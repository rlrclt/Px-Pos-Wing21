import { create } from 'zustand';
import type { AuthUser } from '../types/schema.ts';

export interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  lockScreen: () => void;
  unlockWithPin: (pin: string) => boolean;
  updateCurrentUser: (updates: Partial<AuthUser>) => void;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: initialUser,
  isAuthenticated: !!initialUser,
  isLocked: false,
  updateCurrentUser: (updates: Partial<AuthUser>) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const updatedUser: AuthUser = { ...currentUser, ...updates };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('px_auth_session', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Failed to save updated auth session to localStorage', e);
    }
    set({ currentUser: updatedUser });
  },
  login: (user: AuthUser) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('px_auth_session', JSON.stringify(user));
      }
    } catch (e) {
      console.error('Failed to save auth session to localStorage', e);
    }
    set({ currentUser: user, isAuthenticated: true, isLocked: false });
  },
  logout: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('px_auth_session');
      }
    } catch (e) {
      console.error('Failed to remove auth session from localStorage', e);
    }
    set({ currentUser: null, isAuthenticated: false, isLocked: false });
  },
  lockScreen: () => {
    set({ isLocked: true });
  },
  unlockWithPin: (pin: string) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    const cleanPin = String(pin).trim();
    // Verify against stored pin_hash if available
    if (currentUser.pin_hash && String(currentUser.pin_hash).trim() === cleanPin) {
      set({ isLocked: false });
      return true;
    }
    // Fallback default pin for mock / backwards compatibility
    if (cleanPin === '1234') {
      set({ isLocked: false });
      return true;
    }
    return false;
  },
}));
